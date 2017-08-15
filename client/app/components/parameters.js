import template from './parameters.html';
import parameterSettingsTemplate from './parameter-settings.html';

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
    this.onQuerySelect = (query) => {
      this.parameter.query = query;
    };
    this.searchQueries = (term) => {
      if (!term || term.length < 3) {
        return;
      }

      Query.search({ q: term }, (results) => {
        this.queries = results;
      });
    };
  },
};

function QueryBasedParameterController($scope, Query) {
  $scope.queryResults = [];
  $scope.$watch('param', () => {
    const param = $scope.param;
    if (param.query !== null) {
      Query.resultById(
        { id: param.query.id },
        (result) => {
          const queryResult = result.query_result;
          const columns = queryResult.data.columns;
          const numColumns = columns.length;
          if (numColumns > 0 && columns[0].type === 'string') {
            $scope.queryResults = queryResult.data.rows.map(row => row[columns[0].name]);
          }
        });
    }
  }, true);
}

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
  ngModule.controller('QueryBasedParameterController', QueryBasedParameterController);
  ngModule.component('parameterSettings', ParameterSettingsComponent);
}
