import debug from 'debug';

const logger = debug('redash:directives');

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

function autofocus($timeout) {
  return {
    link(scope, element) {
      $timeout(() => {
        element[0].focus();
      });
    },
  };
}

function TitleService($rootScope) {
  const Title = {
    title: 'Redash',
    set(newTitle) {
      this.title = newTitle;
      $rootScope.$broadcast('$titleChange');
    },
    get() {
      return this.title;
    },
  };

  return Title;
}

function title($rootScope, Title) {
  return {
    restrict: 'E',
    link(scope, element) {
      function updateTitle() {
        const newTitle = Title.get();
        logger('Updating title to: %s', newTitle);
        element.text(newTitle);
      }

      $rootScope.$on('$routeChangeSuccess', (event, to) => {
        if (to.title) {
          Title.set(to.title);
        }
      });
      $rootScope.$on('$titleChange', updateTitle);
    },
  };
}

export default function (ngModule) {
  ngModule.factory('Title', TitleService);
  ngModule.directive('title', title);
  ngModule.directive('compareTo', compareTo);
  ngModule.directive('autofocus', autofocus);
}
