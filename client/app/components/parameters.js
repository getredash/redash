import { extend, filter, forEach, size } from 'lodash';
import template from './parameters.html';
import EditParameterSettingsDialog from './EditParameterSettingsDialog';

function ParametersDirective($location, KeyboardShortcuts) {
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
      applyOnKeyboardShortcut: '<?',
    },
    template,
    link(scope, $element) {
      if (scope.applyOnKeyboardShortcut !== false) {
        const el = $element.get(0);
        const shortcuts = {
          'mod+enter': () => scope.onApply(),
          'alt+enter': () => scope.onApply(),
        };

        const onFocus = () => { KeyboardShortcuts.bind(shortcuts); };
        const onBlur = () => { KeyboardShortcuts.unbind(shortcuts); };

        el.addEventListener('focus', onFocus, true);
        el.addEventListener('blur', onBlur, true);

        scope.$on('$destroy', () => {
          KeyboardShortcuts.unbind(shortcuts);
          el.removeEventListener('focus', onFocus);
          el.removeEventListener('blur', onBlur);
        });
      }

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

      scope.dirtyParamCount = 0;
      scope.$watch(
        'parameters',
        () => {
          scope.dirtyParamCount = size(filter(scope.parameters, 'hasPendingValue'));
        },
        true,
      );

      scope.isApplying = false;
      scope.applyChanges = () => {
        scope.isApplying = true;
        forEach(scope.parameters, p => p.applyPendingValue());
        scope.isApplying = false;
      };

      scope.onApply = () => {
        if (!scope.dirtyParamCount) {
          return false; // so keyboard shortcut doesn't run needlessly
        }

        scope.$apply(scope.applyChanges);
        scope.onValuesChange();
      };
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('parameters', ParametersDirective);
}

init.init = true;
