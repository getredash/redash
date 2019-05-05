import { debounce, extend } from 'lodash';
import template from './parameters.html';
import EditParameterSettingsDialog from './EditParameterSettingsDialog';

function ParametersDirective($location) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      parameters: '=',
      syncValues: '=?',
      editable: '=?',
      applyButton: '=?',
      changed: '&onChange',
      onUpdated: '=',
      onValuesChange: '=',
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

      scope.onValuesChangeDebounced = debounce(scope.onValuesChange, 1000);

      scope.showParameterSettings = (parameter, index) => {
        EditParameterSettingsDialog
          .showModal({ parameter })
          .result.then((updated) => {
            scope.parameters[index] = extend(parameter, updated);
            scope.onUpdated();
          });
      };
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('parameters', ParametersDirective);
}

init.init = true;
