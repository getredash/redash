import { each, debounce, isArray, isObject } from 'underscore';

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
  updateDimensions,
  updateData,
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

    const updateChartDimensions = () => {
      if (updateDimensions(layout, plotlyElement, calculateMargins(plotlyElement))) {
        Plotly.relayout(plotlyElement, layout);
      }
    };

    function update() {
      if (['normal', 'percent'].indexOf(scope.options.series.stacking) >= 0) {
        // Backward compatibility
        scope.options.series.percentValues = scope.options.series.stacking === 'percent';
        scope.options.series.stacking = 'stack';
      }

      data = prepareData(scope.series, scope.options);
      updateData(data, scope.options);
      layout = prepareLayout(plotlyElement, scope.series, scope.options, data);

      // It will auto-purge previous graph
      Plotly.newPlot(plotlyElement, data, layout, plotlyOptions);

      plotlyElement.on('plotly_restyle', (updates) => {
        // This event is triggered if some plotly data/layout has changed.
        // We need to catch only changes of traces visibility to update stacking
        if (isArray(updates) && isObject(updates[0]) && updates[0].visible) {
          updateData(data, scope.options);
          Plotly.relayout(plotlyElement, layout);
        }
      });

      plotlyElement.on('plotly_afterplot', updateChartDimensions);
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

    scope.handleResize = debounce(updateChartDimensions, 50);
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
