import { find, includes, words, capitalize, extend } from 'lodash';
import template from './parameters.html';
import queryBasedParameterTemplate from './query-based-parameter.html';
import parameterSettingsTemplate from './parameter-settings.html';
import parameterInputTemplate from './parameter-input.html';

function humanize(str) {
  return capitalize(words(str).join(' '));
}

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
    this.isNewParameter = this.parameter.name === '';
    this.shouldGenerateTitle = this.isNewParameter && this.parameter.title === '';

    this.parameterAlreadyExists = name => includes(this.resolve.existingParameters, name);

    if (this.parameter.queryId) {
      Query.get({ id: this.parameter.queryId }, (query) => {
        this.queries = [query];
      });
    }

    this.searchQueries = (term) => {
      if (!term || term.length < 3) {
        return;
      }

      Query.query({ q: term }, (results) => {
        this.queries = results.results;
      });
    };

    this.updateTitle = () => {
      if (this.shouldGenerateTitle) {
        this.parameter.title = humanize(this.parameter.name);
      }
    };
  },
};

function optionsFromQueryResult(queryResult) {
  const columns = queryResult.data.columns;
  const numColumns = columns.length;
  let options = [];
  // If there are multiple columns, check if there is a column
  // named 'name' and column named 'value'. If name column is present
  // in results, use name from name column. Similar for value column.
  // Default: Use first string column for name and value.
  if (numColumns > 0) {
    let nameColumn = null;
    let valueColumn = null;
    columns.forEach((column) => {
      const columnName = column.name.toLowerCase();
      if (columnName === 'name') {
        nameColumn = column.name;
      }
      if (columnName === 'value') {
        valueColumn = column.name;
      }
      // Assign first string column as name and value column.
      if (nameColumn === null) {
        nameColumn = column.name;
      }
      if (valueColumn === null) {
        valueColumn = column.name;
      }
    });
    if (nameColumn !== null && valueColumn !== null) {
      options = queryResult.data.rows.map((row) => {
        const queryResultOption = {
          name: row[nameColumn],
          value: row[valueColumn],
        };
        return queryResultOption;
      });
    }
  }
  return options;
}

function updateCurrentValue(param, options) {
  const found = find(options, option => option.value === param.value) !== undefined;

  if (!found) {
    param.value = options[0].value;
  }
}

const QueryBasedParameterComponent = {
  template: queryBasedParameterTemplate,
  bindings: {
    param: '<',
    queryId: '<',
  },
  controller(Query) {
    'ngInject';

    this.$onChanges = (changes) => {
      if (changes.queryId) {
        Query.resultById({ id: this.queryId }, (result) => {
          const queryResult = result.query_result;
          this.queryResultOptions = optionsFromQueryResult(queryResult);
          updateCurrentValue(this.param, this.queryResultOptions);
        });
      }
    };
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
        scope.$watch(
          'parameters',
          () => {
            if (scope.changed) {
              scope.changed({});
            }
            const params = extend({}, $location.search());
            scope.parameters.forEach((param) => {
              extend(params, param.toUrlParams());
            });
            $location.search(params);
          },
          true,
        );
      }

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

const ParameterInputComponent = {
  template: parameterInputTemplate,
  bindings: {
    param: '<',
  },
  controller($scope) {
    // These are input as newline delimited values,
    // so we split them here.
    this.extractEnumOptions = (enumOptions) => {
      if (enumOptions) {
        return enumOptions.split('\n');
      }
      return [];
    };

    $scope.setParamValue = (value) => {
      this.param.setValue(value);
      $scope.$applyAsync();
    };
  },
};

export default function init(ngModule) {
  ngModule.directive('parameters', ParametersDirective);
  ngModule.component('queryBasedParameter', QueryBasedParameterComponent);
  ngModule.component('parameterSettings', ParameterSettingsComponent);
  ngModule.component('parameterInput', ParameterInputComponent);
}

init.init = true;
