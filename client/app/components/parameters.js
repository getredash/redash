import template from './parameters.html';
import queryBasedParameterTemplate from './query-based-parameter.html';
import parameterSettingsTemplate from './parameter-settings.html';

const QueryBasedOption = (query) => {
  const queryBasedOption = {
    id: query.id,
    name: query.name,
  };
  return queryBasedOption;
};

const ParameterSettingsComponent = {
  template: parameterSettingsTemplate,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($sce, Query) {
    'ngInject';

    this.trustAsHtml = html => $sce.trustAsHtml(html);
    this.parameter = this.resolve.parameter;
    this.searchQueries = (term) => {
      if (!term || term.length < 3) {
        return;
      }

      Query.search({ q: term }, (results) => {
        this.queries = results.map(query => QueryBasedOption(query));
      });
    };
  },
};

const QueryBasedParameterComponent = {
  template: queryBasedParameterTemplate,
  bindings: {
    param: '=',
  },
  controller($scope, Query) {
    'ngInject';

    this.queryResultOptions = [];
    $scope.$watch('$ctrl.param', () => {
      if (this.param.queryBasedOption !== null) {
        Query.resultById(
          { id: this.param.queryBasedOption.id },
          (result) => {
            const queryResult = result.query_result;
            const columns = queryResult.data.columns;
            const numColumns = columns.length;
            // If there are multiple columns, check if there is a column
            // named 'name' and column named 'value'. If name column is present
            // in results, use name from name column. Similar for value column.
            // Default: Use first string column for name and value.
            if (numColumns > 0) {
              let nameColumn = null;
              let valueColumn = null;
              columns.forEach((column) => {
                const columnName = column.name.toLowerCase();
                if (column.type === 'string' && columnName === 'name') {
                  nameColumn = column.name;
                }
                if (column.type === 'string' && columnName === 'value') {
                  valueColumn = column.name;
                }
                // Assign first string column as name and value column.
                if (nameColumn === null && column.type === 'string') {
                  nameColumn = column.name;
                }
                if (valueColumn === null && column.type === 'string') {
                  valueColumn = column.name;
                }
              });
              if (nameColumn !== null && valueColumn !== null) {
                this.queryResultOptions = queryResult.data.rows.map((row) => {
                  const queryResultOption = {
                    name: row[nameColumn],
                    value: row[valueColumn],
                  };
                  return queryResultOption;
                });
              }
            }
          });
      }
    }, true);
  },
};

function ParametersDirective($location, $uibModal) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      parameters: '=',
      syncValues: '=?',
      editable: '=?',
      changed: '&onChange',
    },
    template,
    link(scope) {
      // is this the correct location for this logic?
      if (scope.syncValues !== false) {
        scope.$watch('parameters', () => {
          if (scope.changed) {
            scope.changed({});
          }
          scope.parameters.forEach((param) => {
            if (param.value !== null || param.value !== '') {
              $location.search(`p_${param.name}`, param.value);
            }
          });
        }, true);
      }

      // These are input as newline delimited values,
      // so we split them here.
      scope.extractEnumOptions = (enumOptions) => {
        if (enumOptions) {
          return enumOptions.split('\n');
        }
        return [];
      };
      scope.showParameterSettings = (param) => {
        $uibModal.open({
          component: 'parameterSettings',
          resolve: {
            parameter: param,
          },
        });
      };
    },
  };
}

export default function (ngModule) {
  ngModule.directive('parameters', ParametersDirective);
  ngModule.component('queryBasedParameter', QueryBasedParameterComponent);
  ngModule.component('parameterSettings', ParameterSettingsComponent);
}
