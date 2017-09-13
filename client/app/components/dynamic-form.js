import { isUndefined, each, contains, find } from 'underscore';
import endsWith from 'underscore.string/endsWith';
import template from './dynamic-form.html';

function DynamicForm($http, toastr, $q) {
  function orderedInputs(properties, order) {
    const inputs = new Array(order.length);
    Object.keys(properties).forEach((key) => {
      const position = order.indexOf(key);
      const input = { name: key, property: properties[key] };
      if (position > -1) {
        inputs[position] = input;
      } else {
        inputs.push(input);
      }
    });
    return inputs;
  }

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
        }

        const type = find(types, t => t.type === $scope.target.type);
        const configurationSchema = type.configuration_schema;

        $scope.fields = orderedInputs(
          configurationSchema.properties,
          configurationSchema.order || []
        );

        return type;
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

        $scope.$watch('target.type', (current, prev) => {
          if (prev !== current) {
            if (prev !== undefined) {
              $scope.target.options = {};
            }

            const type = setType($scope.types);

            if (Object.keys($scope.target.options).length === 0) {
              const properties = type.configuration_schema.properties;
              Object.keys(properties).forEach((property) => {
                if (!isUndefined(properties[property].default)) {
                  $scope.target.options[property] = properties[property].default;
                }
              });
            }
          }
        });
      });


      $scope.saveChanges = () => {
        $scope.target.$save(
          () => {
            toastr.success('Saved.');
            $scope.dataSourceForm.$setPristine();
          },
          (error) => {
            if (error.status === 400 && 'message' in error.data) {
              toastr.error(error.data.message);
            } else {
              toastr.error('Failed saving.');
            }
          }
        );
      };
    },
  };
}

export default function (ngModule) {
  ngModule.directive('dynamicForm', DynamicForm);
}
