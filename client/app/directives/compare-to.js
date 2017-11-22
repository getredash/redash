function compareTo() {
  return {
    require: 'ngModel',
    scope: {
      otherModelValue: '=compareTo',
    },
    link(scope, element, attributes, ngModel) {
      const validate = (value) => {
        ngModel.$setValidity('compareTo', value === scope.otherModelValue);
      };

      scope.$watch('otherModelValue', () => {
        validate(ngModel.$modelValue);
      });

      ngModel.$parsers.push((value) => {
        validate(value);
        return value;
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('compareTo', compareTo);
}
