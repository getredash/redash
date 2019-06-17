import { extend, forEach } from 'lodash';
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

      scope.showParameterSettings = (parameter, index) => {
        EditParameterSettingsDialog
          .showModal({ parameter })
          .result.then((updated) => {
            scope.parameters[index] = extend(parameter, updated);
            scope.onUpdated();
          });
      };

      scope.dirtyParams = {}; // when populated, apply button appears

      scope.onParamValueChanged = (param, newValue, isDirty) => {
        const key = param.name;
        if (isDirty) {
          scope.dirtyParams[key] = () => {
            param.setValue(newValue);
            scope.$apply();
          };
        } else {
          delete scope.dirtyParams[key];
        }
        scope.$apply();
      };

      scope.onApply = () => {
        // set new values for each param
        forEach(scope.dirtyParams, setValue => setValue());
        // execute query with new params
        scope.onValuesChange();
        // reset
        scope.dirtyParams = {};
      };
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('parameters', ParametersDirective);
}

init.init = true;
