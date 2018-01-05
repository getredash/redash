import { each, debounce } from 'underscore';
import d3 from 'd3';

import Plotly from 'plotly.js/lib/core';
import bar from 'plotly.js/lib/bar';
import pie from 'plotly.js/lib/pie';
import histogram from 'plotly.js/lib/histogram';
import box from 'plotly.js/lib/box';

import {
  ColorPalette,
  prepareData,
  prepareLayout,
  calculateMargins,
  applyMargins,
  updateStacking,
  normalizeValue,
} from './utils';

Plotly.register([bar, pie, histogram, box]);
Plotly.setPlotConfig({
  modeBarButtonsToRemove: ['sendDataToCloud'],
});

const PlotlyChart = () => ({
  restrict: 'E',
  template: '<div class="plotly-chart-container" resize-event="handleResize()"></div>',
  scope: {
    options: '=',
    series: '=',
  },
  link(scope, element) {
    const plotlyElement = element[0].querySelector('.plotly-chart-container');
    const plotlyOptions = { showLink: false, displaylogo: false };
    let layout = {};
    let data = [];

    const applyAutoMargins = debounce(() => {
      if (applyMargins(layout.margin, calculateMargins(plotlyElement))) {
        Plotly.relayout(plotlyElement, layout);
      }
    }, 100);

    function update() {
      if (['normal', 'percent'].indexOf(scope.options.series.stacking) >= 0) {
        // Backward compatibility
        scope.options.series.percentValues = scope.options.series.stacking === 'percent';
        scope.options.series.stacking = 'stack';
      }
      scope.options.series.percentValues = scope.options.series.percentValues &&
        !!scope.options.series.stacking;

      data = prepareData(scope.series, scope.options);
      updateStacking(data, scope.options);
      layout = prepareLayout(plotlyElement, scope.series, scope.options, data);

      // It will auto-purge previous graph
      Plotly.newPlot(plotlyElement, data, layout, plotlyOptions);

      plotlyElement.on('plotly_afterplot', () => {
        applyAutoMargins();

        plotlyElement.querySelectorAll('.legendtoggle').forEach((rectDiv) => {
          d3.select(rectDiv).on('click', (items) => {
            // `items` contains an array of series (in internal plotly format)
            // series can be mapped to source data using `items[i].trace.index`
            each(items, (item) => {
              const itemClicked = data[item.trace.index];
              itemClicked.visible = (itemClicked.visible === true) ? 'legendonly' : true;
            });
            updateStacking(data, scope.options);
            // Plotly will redraw graph by itself
          });
        });
      });
    }
    update();

    scope.$watch('series', (oldValue, newValue) => {
      if (oldValue !== newValue) {
        update();
      }
    });
    scope.$watch('options', (oldValue, newValue) => {
      if (oldValue !== newValue) {
        update();
      }
    }, true);

    scope.handleResize = debounce(() => {
      layout = prepareLayout(plotlyElement, scope.series, scope.options, data);
      Plotly.relayout(plotlyElement, layout);
    }, 100);
  },
});

const CustomPlotlyChart = clientConfig => ({
  restrict: 'E',
  template: '<div class="plotly-chart-container" resize-event="handleResize()"></div>',
  scope: {
    series: '=',
    options: '=',
  },
  link(scope, element) {
    if (!clientConfig.allowCustomJSVisualizations) {
      return;
    }

    const refresh = () => {
      // Clear existing data with blank data for succeeding codeCall adds data to existing plot.
      Plotly.newPlot(element[0].firstChild);

      try {
        // eslint-disable-next-line no-new-func
        const codeCall = new Function('x, ys, element, Plotly', scope.options.customCode);
        codeCall(scope.x, scope.ys, element[0].children[0], Plotly);
      } catch (err) {
        if (scope.options.enableConsoleLogs) {
          // eslint-disable-next-line no-console
          console.log(`Error while executing custom graph: ${err}`);
        }
      }
    };

    const timeSeriesToPlotlySeries = () => {
      scope.x = [];
      scope.ys = {};
      each(scope.series, (series) => {
        scope.ys[series.name] = [];
        each(series.data, (point) => {
          scope.x.push(normalizeValue(point.x));
          scope.ys[series.name].push(normalizeValue(point.y));
        });
      });
    };

    scope.handleResize = () => {
      refresh();
    };

    scope.$watch('[options.customCode, options.autoRedraw]', () => {
      refresh();
    }, true);

    scope.$watch('series', () => {
      timeSeriesToPlotlySeries();
      refresh();
    }, true);
  },
});

export default function init(ngModule) {
  ngModule.constant('ColorPalette', ColorPalette);
  ngModule.directive('plotlyChart', PlotlyChart);
  ngModule.directive('customPlotlyChart', CustomPlotlyChart);
}
