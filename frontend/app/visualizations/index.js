import moment from 'moment';
import { pluck, isEmpty, isArray, reduce } from 'underscore';
import { copy } from 'angular';

import filtersTemplate from './filters.html';
import editVisualizationTemplate from './edit-visualization.html';

import counterVisualization from './counter';
import tableVisualization from './table';

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
    template: `<filters></filters>\n${Visualization.renderVisualizationsTemplate}`,
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
  };
}

function Filters() {
  return {
    restrict: 'E',
    template: filtersTemplate,
  };
}

function FilterValueFilter(clientConfig) {
  return (value, filter) => {
    if (isArray(value)) {
      value = value[0];
    }

    // TODO: deduplicate code with table.js:
    if (filter.column.type === 'date') {
      if (value && moment.isMoment(value)) {
        return value.format(clientConfig.dateFormat);
      }
    } else if (filter.column.type === 'datetime') {
      if (value && moment.isMoment(value)) {
        return value.format(clientConfig.dateTimeFormat);
      }
    }

    return value;
  };
}

function EditVisualizationForm($window, currentUser, Events, Visualization, toastr) {
  return {
    restrict: 'E',
    template: editVisualizationTemplate,
    replace: true,
    scope: {
      query: '=',
      queryResult: '=',
      originalVisualization: '=?',
      onNewSuccess: '=?',
      modalInstance: '=?',
    },
    link(scope) {
      scope.visualization = copy(scope.originalVisualization);
      scope.editRawOptions = currentUser.hasPermission('edit_raw_chart');
      scope.visTypes = Visualization.visualizationTypes;

      scope.newVisualization = () =>
         ({
           type: Visualization.defaultVisualization.type,
           name: Visualization.defaultVisualization.name,
           description: '',
           options: Visualization.defaultVisualization.defaultOptions,
         })
      ;

      if (!scope.visualization) {
        const unwatch = scope.$watch('query.id', (queryId) => {
          if (queryId) {
            unwatch();

            scope.visualization = scope.newVisualization();
          }
        });
      }

      scope.$watch('visualization.type', (type, oldType) => {
        // if not edited by user, set name to match type
        if (type && oldType !== type && scope.visualization && !scope.visForm.name.$dirty) {
          scope.visualization.name = Visualization.visualizations[scope.visualization.type].name;
        }

        if (type && oldType !== type && scope.visualization) {
          scope.visualization.options = Visualization.visualizations[scope.visualization.type].defaultOptions;
        }
      });

      scope.submit = () => {
        if (scope.visualization.id) {
          Events.record(currentUser, 'update', 'visualization', scope.visualization.id, { type: scope.visualization.type });
        } else {
          Events.record(currentUser, 'create', 'visualization', null, { type: scope.visualization.type });
        }

        scope.visualization.query_id = scope.query.id;

        Visualization.save(scope.visualization, (result) => {
          toastr.success('Visualization saved');

          const visIds = pluck(scope.query.visualizations, 'id');
          const index = visIds.indexOf(result.id);
          if (index > -1) {
            scope.query.visualizations[index] = result;
          } else {
            // new visualization
            scope.query.visualizations.push(result);
            if (scope.onNewSuccess) {
              scope.onNewSuccess(result);
            }
          }
          scope.modalInstance.close();
        }, () => {
          toastr.error('Visualization could not be saved');
        });
      };

      scope.close = () => {
        if (scope.visForm.$dirty) {
          if ($window.confirm('Are you sure you want to close the editor without saving?')) {
            scope.modalInstance.close();
          }
        } else {
          scope.modalInstance.close();
        }
      };
    },
  };
}

export default function (ngModule) {
  ngModule.provider('Visualization', VisualizationProvider);
  ngModule.directive('visualizationRenderer', VisualizationRenderer);
  ngModule.directive('visualizationOptionsEditor', VisualizationOptionsEditor);
  ngModule.directive('visualizationName', VisualizationName);
  ngModule.directive('filters', Filters);
  ngModule.filter('filterValue', FilterValueFilter);
  ngModule.directive('editVisulatizationForm', EditVisualizationForm);
  counterVisualization(ngModule);
  tableVisualization(ngModule);
}
