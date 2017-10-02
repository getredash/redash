import moment from 'moment';
import { isEmpty, isArray, reduce } from 'underscore';

import registerEditVisualizationDialog from './edit-visualization-dialog';
import counterVisualization from './counter';
import tableVisualization from './table';
import uiGridVisualization from './uigrid';
import chartVisualization from './chart';
import sunburstVisualization from './sunburst';
import sankeyVisualization from './sankey';
import wordCloudVisualization from './word-cloud';
import boxPlotVisualization from './box-plot';
import cohortVisualization from './cohort';
import mapVisualization from './map';
import pivotVisualization from './pivot';

function VisualizationProvider() {
  this.visualizations = {};
  this.visualizationTypes = {};
  const defaultConfig = {
    defaultOptions: {},
    skipTypes: false,
    editorTemplate: null,
  };

  this.registerVisualization = (config) => {
    const visualization = Object.assign({}, defaultConfig, config);

    // TODO: this is prone to errors; better refactor.
    if (isEmpty(this.visualizations)) {
      this.defaultVisualization = visualization;
    }

    this.visualizations[config.type] = visualization;

    if (!config.skipTypes) {
      this.visualizationTypes[config.name] = config.type;
    }
  };

  this.getSwitchTemplate = (property) => {
    const pattern = /(<[a-zA-Z0-9-]*?)( |>)/;

    let mergedTemplates = reduce(this.visualizations, (templates, visualization) => {
      if (visualization[property]) {
        const ngSwitch = `$1 ng-switch-when="${visualization.type}" $2`;
        const template = visualization[property].replace(pattern, ngSwitch);

        return `${templates}\n${template}`;
      }

      return templates;
    }, '');

    mergedTemplates = `<div ng-switch on="visualization.type">${mergedTemplates}</div>`;

    return mergedTemplates;
  };

  this.$get = ($resource) => {
    const Visualization = $resource('api/visualizations/:id', { id: '@id' });
    Visualization.visualizations = this.visualizations;
    Visualization.visualizationTypes = this.visualizationTypes;
    Visualization.renderVisualizationsTemplate = this.getSwitchTemplate('renderTemplate');
    Visualization.editorTemplate = this.getSwitchTemplate('editorTemplate');
    Visualization.defaultVisualization = this.defaultVisualization;

    return Visualization;
  };
}

function VisualizationName(Visualization) {
  return {
    restrict: 'E',
    scope: {
      visualization: '=',
    },
    template: '{{name}}',
    replace: false,
    link(scope) {
      if (Visualization.visualizations[scope.visualization.type]) {
        const defaultName = Visualization.visualizations[scope.visualization.type].name;
        if (defaultName !== scope.visualization.name) {
          scope.name = scope.visualization.name;
        }
      }
    },
  };
}

function VisualizationRenderer(Visualization) {
  return {
    restrict: 'E',
    scope: {
      visualization: '=',
      queryResult: '=',
    },
    // TODO: using switch here (and in the options editor) might introduce errors and bad
    // performance wise. It's better to eventually show the correct template based on the
    // visualization type and not make the browser render all of them.
    template: `<filters filters="filters"></filters>\n${Visualization.renderVisualizationsTemplate}`,
    replace: false,
    link(scope) {
      scope.$watch('queryResult && queryResult.getFilters()', (filters) => {
        if (filters) {
          scope.filters = filters;
        }
      });
    },
  };
}

function VisualizationOptionsEditor(Visualization) {
  return {
    restrict: 'E',
    template: Visualization.editorTemplate,
    replace: false,
    scope: {
      visualization: '=',
      query: '=',
      queryResult: '=',
    },
  };
}

function FilterValueFilter(clientConfig) {
  return (value, filter) => {
    let firstValue = value;
    if (isArray(value)) {
      firstValue = value[0];
    }

    // TODO: deduplicate code with table.js:
    if (filter.column.type === 'date') {
      if (firstValue && moment.isMoment(firstValue)) {
        return firstValue.format(clientConfig.dateFormat);
      }
    } else if (filter.column.type === 'datetime') {
      if (firstValue && moment.isMoment(firstValue)) {
        return firstValue.format(clientConfig.dateTimeFormat);
      }
    }

    return firstValue;
  };
}

export default function (ngModule) {
  ngModule.provider('Visualization', VisualizationProvider);
  ngModule.directive('visualizationRenderer', VisualizationRenderer);
  ngModule.directive('visualizationOptionsEditor', VisualizationOptionsEditor);
  ngModule.directive('visualizationName', VisualizationName);
  ngModule.filter('filterValue', FilterValueFilter);
  registerEditVisualizationDialog(ngModule);
  chartVisualization(ngModule);
  counterVisualization(ngModule);
  sunburstVisualization(ngModule);
  sankeyVisualization(ngModule);
  wordCloudVisualization(ngModule);
  boxPlotVisualization(ngModule);
  cohortVisualization(ngModule);
  mapVisualization(ngModule);
  pivotVisualization(ngModule);
  tableVisualization(ngModule);
  uiGridVisualization(ngModule);
}
