import { extend } from 'lodash';
import template from './parameters.html';
import qs from '@/services/query-string';
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
            const params = qs.fromUrl();
            scope.parameters.forEach((param) => {
              extend(params.queryParameters, param.toUrlParams());
            });
            $location.search(qs.toString(params));
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
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('parameters', ParametersDirective);
}

init.init = true;
