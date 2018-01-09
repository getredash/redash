import { isUndefined, each, contains } from 'underscore';
import endsWith from 'underscore.string/endsWith';
import template from './dynamic-form.html';

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

function normalizeSchema(configurationSchema) {
  each(configurationSchema.properties, (prop, name) => {
    if (name === 'password' || name === 'passwd') {
      prop.type = 'password';
    }

    if (endsWith(name, 'File')) {
      prop.type = 'file';
    }

    if (prop.type === 'boolean') {
      prop.type = 'checkbox';
    }

    prop.required = contains(configurationSchema.required, name);
  });

  configurationSchema.order = configurationSchema.order || [];
}

function setDefaults(configurationSchema, options) {
  if (Object.keys(options).length === 0) {
    const properties = configurationSchema.properties;
    Object.keys(properties).forEach((property) => {
      if (!isUndefined(properties[property].default)) {
        options[property] = properties[property].default;
      }
    });
  }
}

function DynamicForm($http, toastr) {
  return {
    restrict: 'E',
    replace: 'true',
    transclude: true,
    template,
    scope: {
      target: '=',
      type: '=',
      actions: '=',
    },
    link($scope) {
      const configurationSchema = $scope.type.configuration_schema;
      normalizeSchema(configurationSchema);
      $scope.fields = orderedInputs(configurationSchema.properties, configurationSchema.order);
      setDefaults(configurationSchema, $scope.target.options);

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
            $scope.dynamicForm.$setPristine();
          }
          if (v) {
            $scope.target.options[k] = v.base64;
          }
        });
      });

      $scope.saveChanges = () => {
        $scope.target.$save(
          () => {
            toastr.success('Saved.');
            $scope.dynamicForm.$setPristine();
          },
          (error) => {
            if (error.status === 400 && 'message' in error.data) {
              toastr.error(error.data.message);
            } else {
              toastr.error('Failed saving.');
            }
          },
        );
      };
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('dynamicForm', DynamicForm);
}
