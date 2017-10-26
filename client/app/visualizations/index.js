import moment from 'moment';
import { isArray, reduce } from 'underscore';

function VisualizationProvider() {
  this.visualizations = {};
  // this.visualizationTypes = {};
  this.visualizationTypes = [];
  const defaultConfig = {
    defaultOptions: {},
    skipTypes: false,
    editorTemplate: null,
  };

  this.registerVisualization = (config) => {
    const visualization = Object.assign({}, defaultConfig, config);

    // TODO: this is prone to errors; better refactor.
    if (this.defaultVisualization === undefined && !visualization.name.match(/Deprecated/)) {
      this.defaultVisualization = visualization;
    }

    this.visualizations[config.type] = visualization;

    if (!config.skipTypes) {
      this.visualizationTypes.push({ name: config.name, type: config.type });
    }
  };

  this.getSwitchTemplate = (property) => {
    const pattern = /(<[a-zA-Z0-9-]*?)( |>)/;

    let mergedTemplates = reduce(
      this.visualizations,
      (templates, visualization) => {
        if (visualization[property]) {
          const ngSwitch = `$1 ng-switch-when="${visualization.type}" $2`;
          const template = visualization[property].replace(pattern, ngSwitch);

          return `${templates}\n${template}`;
        }

        return templates;
      },
      '',
    );

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

export default function init(ngModule) {
  ngModule.provider('Visualization', VisualizationProvider);
  ngModule.directive('visualizationRenderer', VisualizationRenderer);
  ngModule.directive('visualizationOptionsEditor', VisualizationOptionsEditor);
  ngModule.directive('visualizationName', VisualizationName);
  ngModule.filter('filterValue', FilterValueFilter);
}
