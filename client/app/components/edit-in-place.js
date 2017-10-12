import $ from 'jquery';
import { isEmpty } from 'underscore';

// From: http://jsfiddle.net/joshdmiller/NDFHg/
function EditInPlace() {
  return {
    restrict: 'E',
    scope: {
      value: '=',
      ignoreBlanks: '=',
      editable: '=',
      done: '=',
    },
    template(tElement, tAttrs) {
      const elType = tAttrs.editor || 'input';
      const placeholder = tAttrs.placeholder || 'Click to edit';

      let viewMode = '';

      if (tAttrs.markdown === 'true') {
        viewMode = '<span ng-click="editable && edit()" ng-bind-html="value|markdown" ng-class="{editable: editable}"></span>';
      } else {
        viewMode = '<span ng-click="editable && edit()" ng-bind="value" ng-class="{editable: editable}"></span>';
      }

      const placeholderSpan = `<span ng-click="editable && edit()"
                                     ng-show="editable && !value"
                                     ng-class="{editable: editable}">${placeholder}</span>`;
      const editor = '<{elType} ng-model="value" class="rd-form-control"></{elType}>'.replace('{elType}', elType);

      return viewMode + placeholderSpan + editor;
    },
    link($scope, element) {
      // Let's get a reference to the input element, as we'll want to reference it.
      const inputElement = $(element.children()[2]);
      const keycodeEnter = 13;
      const keycodeEscape = 27;

      // This directive should have a set class so we can style it.
      element.addClass('edit-in-place');

      // Initially, we're not editing.
      $scope.editing = false;

      // ng-click handler to activate edit-in-place
      $scope.edit = () => {
        $scope.oldValue = $scope.value;

        $scope.editing = true;

        // We control display through a class on the directive itself. See the CSS.
        element.addClass('active');

        // And we must focus the element.
        // `angular.element()` provides a chainable array, like jQuery so to access
        // a native DOM function, we have to reference the first element in the array.
        inputElement[0].focus();
      };

      function save() {
        if ($scope.editing) {
          if ($scope.ignoreBlanks && isEmpty($scope.value)) {
            $scope.value = $scope.oldValue;
          }
          $scope.editing = false;
          element.removeClass('active');

          if ($scope.value !== $scope.oldValue) {
            if ($scope.done) {
              $scope.done();
            }
          }
        }
      }

      $(inputElement).keydown((e) => {
        // 'return' or 'enter' key pressed
        // allow 'shift' to break lines
        if (e.which === keycodeEnter && !e.shiftKey) {
          e.preventDefault();
          save();
        } else if (e.which === keycodeEscape) {
          $scope.value = $scope.oldValue;
          $scope.$apply(() => {
            $(inputElement[0]).blur();
          });
        }
      }).blur(() => {
        save();
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('editInPlace', EditInPlace);
}
