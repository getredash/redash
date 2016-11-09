import { each, contains, find } from 'underscore';
import endsWith from 'underscore.string/endsWith';
import template from './dynamic-form.html';

function DynamicForm($http, toastr, $q) {
  return {
    restrict: 'E',
    replace: 'true',
    transclude: true,
    template,
    scope: {
      target: '=',
      type: '@type',
      actions: '=',
    },
    link($scope) {
      function setType(types) {
        if ($scope.target.type === undefined) {
          $scope.target.type = types[0].type;
          return types[0];
        }

        $scope.type = find(types, t => t.type === $scope.target.type);
      }

      $scope.inProgressActions = {};
      if ($scope.actions) {
        $scope.actions.forEach((action) => {
          const originalCallback = action.callback;
          const name = action.name;
          action.callback = () => {
            action.name = `<i class="zmdi zmdi-spinner zmdi-hc-spin"></i> ${name}`;

            $scope.inProgressActions[action.name] = true;
            function release() {
              $scope.inProgressActions[action.name] = false;
              action.name = name;
            }
            originalCallback(release);
          };
        });
      }

      $scope.files = {};

      $scope.$watchCollection('files', () => {
        each($scope.files, (v, k) => {
          // THis is needed because angular-base64-upload sets the value to null at initialization,
          // causing the field to be marked as dirty even if it wasn't changed.
          if (!v && $scope.target.options[k]) {
            $scope.dataSourceForm.$setPristine();
          }
          if (v) {
            $scope.target.options[k] = v.base64;
          }
        });
      });

      const typesPromise = $http.get(`api/${$scope.type}/types`);

      $q.all([typesPromise, $scope.target.$promise]).then((responses) => {
        const types = responses[0].data;
        setType(types);

        $scope.types = types;

        types.forEach((type) => {
          each(type.configuration_schema.properties, (prop, name) => {
            if (name === 'password' || name === 'passwd') {
              prop.type = 'password';
            }

            if (endsWith(name, 'File')) {
              prop.type = 'file';
            }

            if (prop.type === 'boolean') {
              prop.type = 'checkbox';
            }

            prop.required = contains(type.configuration_schema.required, name);
          });
        });
      });

      $scope.$watch('target.type', (current, prev) => {
        if (prev !== current) {
          if (prev !== undefined) {
            $scope.target.options = {};
          }
          setType($scope.types);
        }
      });

      $scope.saveChanges = () => {
        $scope.target.$save(() => {
          toastr.success('Saved.');
          $scope.dataSourceForm.$setPristine();
        }, () => {
          toastr.error('Failed saving.');
        });
      };
    },
  };
}

export default function (ngModule) {
  ngModule.directive('dynamicForm', DynamicForm);
}
