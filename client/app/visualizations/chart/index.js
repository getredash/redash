import {
  some, partial, intersection, without, includes, sortBy, each, map, keys, difference, merge, isNil, trim, pick,
} from 'lodash';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';
import { clientConfig } from '@/services/auth';
import ColorPalette from '@/visualizations/ColorPalette';
import getChartData from './getChartData';
import template from './chart.html';
import editorTemplate from './chart-editor.html';

const DEFAULT_OPTIONS = {
  globalSeriesType: 'column',
  sortX: true,
  legend: { enabled: true },
  yAxis: [{ type: 'linear' }, { type: 'linear', opposite: true }],
  xAxis: { type: '-', labels: { enabled: true } },
  error_y: { type: 'data', visible: true },
  series: { stacking: null, error_y: { type: 'data', visible: true } },
  seriesOptions: {},
  valuesOptions: {},
  columnMapping: {},

  // showDataLabels: false, // depends on chart type
  numberFormat: '0,0[.]00000',
  percentFormat: '0[.]00%',
  // dateTimeFormat: 'DD/MM/YYYY HH:mm', // will be set from clientConfig
  textFormat: '', // default: combination of {{ @@yPercent }} ({{ @@y }} ± {{ @@yError }})
};

function initEditorForm(options, columns) {
  const result = {
    yAxisColumns: [],
    seriesList: sortBy(keys(options.seriesOptions), name => options.seriesOptions[name].zIndex),
    valuesList: keys(options.valuesOptions),
  };

  // Use only mappings for columns that exists in query results
  const mappings = pick(
    options.columnMapping,
    map(columns, c => c.name),
  );

  each(mappings, (type, column) => {
    switch (type) {
      case 'x':
        result.xAxisColumn = column;
        break;
      case 'y':
        result.yAxisColumns.push(column);
        break;
      case 'series':
        result.groupby = column;
        break;
      case 'yError':
        result.errorColumn = column;
        break;
      case 'size':
        result.sizeColumn = column;
        break;
      case 'zVal':
        result.zValColumn = column;
        break;
      // no default
    }
  });

  return result;
}

const ChartRenderer = {
  template,
  bindings: {
    data: '<',
    options: '<',
  },
  controller($scope) {
    this.chartSeries = [];

    const update = () => {
      if (this.data) {
        this.chartSeries = getChartData(this.data.rows, this.options);
      }
    };

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

const ChartEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.setCurrentTab = (tab) => {
      this.currentTab = tab;
    };

    this.colors = {
      Automatic: null,
      ...ColorPalette,
    };

    this.stackingOptions = {
      Disabled: null,
      Stack: 'stack',
    };

    this.chartTypes = {
      line: { name: 'Line', icon: 'line-chart' },
      column: { name: 'Bar', icon: 'bar-chart' },
      area: { name: 'Area', icon: 'area-chart' },
      pie: { name: 'Pie', icon: 'pie-chart' },
      scatter: { name: 'Scatter', icon: 'circle-o' },
      bubble: { name: 'Bubble', icon: 'circle-o' },
      heatmap: { name: 'Heatmap', icon: 'th' },
      box: { name: 'Box', icon: 'square-o' },
    };

    if (clientConfig.allowCustomJSVisualizations) {
      this.chartTypes.custom = { name: 'Custom', icon: 'code' };
    }

    this.xAxisScales = [
      { label: 'Auto Detect', value: '-' },
      { label: 'Datetime', value: 'datetime' },
      { label: 'Linear', value: 'linear' },
      { label: 'Logarithmic', value: 'logarithmic' },
      { label: 'Category', value: 'category' },
    ];
    this.yAxisScales = ['linear', 'logarithmic', 'datetime', 'category'];

    this.colorScheme = ['Blackbody', 'Bluered', 'Blues', 'Earth', 'Electric',
      'Greens', 'Greys', 'Hot', 'Jet', 'Picnic', 'Portland',
      'Rainbow', 'RdBu', 'Reds', 'Viridis', 'YlGnBu', 'YlOrRd', 'Custom...'];

    this.chartTypeChanged = () => {
      keys(this.options.seriesOptions).forEach((key) => {
        this.options.seriesOptions[key].type = this.options.globalSeriesType;
      });
      this.options.showDataLabels = this.options.globalSeriesType === 'pie';
      $scope.$applyAsync();
    };

    this.showSizeColumnPicker = () => some(this.options.seriesOptions, options => options.type === 'bubble');
    this.showZColumnPicker = () => some(this.options.seriesOptions, options => options.type === 'heatmap');

    if (isNil(this.options.customCode)) {
      this.options.customCode = trim(`
// Available variables are x, ys, element, and Plotly
// Type console.log(x, ys); for more info about x and ys
// To plot your graph call Plotly.plot(element, ...)
// Plotly examples and docs: https://plot.ly/javascript/
      `);
    }

    this.form = initEditorForm(this.options, this.data.columns);

    const refreshColumns = () => {
      this.columns = this.data.columns;
      this.columnNames = map(this.columns, c => c.name);
      if (this.columnNames.length > 0) {
        each(difference(keys(this.options.columnMapping), this.columnNames), (column) => {
          delete this.options.columnMapping[column];
        });
      }
    };

    const refreshColumnsAndForm = () => {
      refreshColumns();
      const data = this.data;
      if (data && (data.columns.length > 0) && (data.rows.length > 0)) {
        this.form.yAxisColumns = intersection(this.form.yAxisColumns, this.columnNames);
        if (!includes(this.columnNames, this.form.xAxisColumn)) {
          this.form.xAxisColumn = undefined;
        }
        if (!includes(this.columnNames, this.form.groupby)) {
          this.form.groupby = undefined;
        }
      }
    };

    const refreshSeries = () => {
      const chartData = getChartData(this.data.rows, this.options);
      const seriesNames = map(chartData, s => s.name);
      const existing = keys(this.options.seriesOptions);
      each(difference(seriesNames, existing), (name) => {
        this.options.seriesOptions[name] = {
          type: this.options.globalSeriesType,
          yAxis: 0,
        };
        this.form.seriesList.push(name);
      });
      each(difference(existing, seriesNames), (name) => {
        this.form.seriesList = without(this.form.seriesList, name);
        delete this.options.seriesOptions[name];
      });

      if (this.options.globalSeriesType === 'pie') {
        const uniqueValuesNames = new Set();
        each(chartData, (series) => {
          each(series.data, (row) => {
            uniqueValuesNames.add(row.x);
          });
        });
        const valuesNames = [];
        uniqueValuesNames.forEach(v => valuesNames.push(v));

        // initialize newly added values
        const newValues = difference(valuesNames, keys(this.options.valuesOptions));
        each(newValues, (name) => {
          this.options.valuesOptions[name] = {};
          this.form.valuesList.push(name);
        });
        // remove settings for values that are no longer available
        each(keys(this.options.valuesOptions), (name) => {
          if (valuesNames.indexOf(name) === -1) {
            delete this.options.valuesOptions[name];
          }
        });
        this.form.valuesList = intersection(this.form.valuesList, valuesNames);
      }
    };

    const setColumnRole = (role, column) => {
      this.options.columnMapping[column] = role;
    };

    const unsetColumn = column => setColumnRole('unused', column);

    refreshColumns();

    $scope.$watch('$ctrl.options.columnMapping', refreshSeries, true);

    $scope.$watch('$ctrl.data', () => {
      refreshColumnsAndForm();
      refreshSeries();
    });

    $scope.$watchCollection('$ctrl.form.seriesList', (value) => {
      each(value, (name, index) => {
        this.options.seriesOptions[name].zIndex = index;
        this.options.seriesOptions[name].index = 0; // is this needed?
      });
    });

    $scope.$watchCollection('$ctrl.form.yAxisColumns', (value, old) => {
      each(old, unsetColumn);
      each(value, partial(setColumnRole, 'y'));
    });

    $scope.$watch('$ctrl.form.xAxisColumn', (value, old) => {
      if (old !== undefined) { unsetColumn(old); }
      if (value !== undefined) { setColumnRole('x', value); }
    });

    $scope.$watch('$ctrl.form.errorColumn', (value, old) => {
      if (old !== undefined) { unsetColumn(old); }
      if (value !== undefined) { setColumnRole('yError', value); }
    });

    $scope.$watch('$ctrl.form.sizeColumn', (value, old) => {
      if (old !== undefined) { unsetColumn(old); }
      if (value !== undefined) { setColumnRole('size', value); }
    });

    $scope.$watch('$ctrl.form.zValColumn', (value, old) => {
      if (old !== undefined) { unsetColumn(old); }
      if (value !== undefined) { setColumnRole('zVal', value); }
    });

    $scope.$watch('$ctrl.form.groupby', (value, old) => {
      if (old !== undefined) { unsetColumn(old); }
      if (value !== undefined) { setColumnRole('series', value); }
    });

    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);

    this.templateHint = `
      <div class="p-b-5">Use special names to access additional properties:</div>
      <div><code>{{ @@name }}</code> series name;</div>
      <div><code>{{ @@x }}</code> x-value;</div>
      <div><code>{{ @@y }}</code> y-value;</div>
      <div><code>{{ @@yPercent }}</code> relative y-value;</div>
      <div><code>{{ @@yError }}</code> y deviation;</div>
      <div><code>{{ @@size }}</code> bubble size;</div>
      <div class="p-t-5">Also, all query result columns can be referenced using
        <code class="text-nowrap">{{ column_name }}</code> syntax.</div>
    `;
  },
};

export default function init(ngModule) {
  ngModule.component('chartRenderer', ChartRenderer);
  ngModule.component('chartEditor', ChartEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'CHART',
      name: 'Chart',
      getOptions: options => merge({}, DEFAULT_OPTIONS, {
        showDataLabels: options.globalSeriesType === 'pie',
        dateTimeFormat: clientConfig.dateTimeFormat,
      }, options),
      Renderer: angular2react('chartRenderer', ChartRenderer, $injector),
      Editor: angular2react('chartEditor', ChartEditor, $injector),

      defaultColumns: 3,
      defaultRows: 8,
      minColumns: 1,
      minRows: 5,
    });
  });
}

init.init = true;
