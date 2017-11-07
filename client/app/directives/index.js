import debug from 'debug';
import * as _ from 'underscore';

const logger = debug('redash:directives');

const requestAnimationFrame = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame;

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

function gridsterAutoHeight($timeout) {
  return {
    restrict: 'A',
    require: 'gridsterItem',
    link($scope, $element, attr, controller) {
      let destroyed = false;

      function updateHeight() {
        const wrapper = $element[0];
        const element = wrapper.querySelector(attr.gridsterAutoHeight);
        if (element) {
          if (element.scrollHeight > element.offsetHeight) {
            const additionalHeight = wrapper.offsetHeight - element.offsetHeight +
              _.last(controller.gridster.margins);

            const contentsHeight = element.scrollHeight;
            $timeout(() => {
              controller.sizeY = Math.ceil((contentsHeight + additionalHeight) /
                controller.gridster.curRowHeight);
            });
          }
        }

        if (!destroyed) {
          requestAnimationFrame(updateHeight);
        }
      }

      if (controller.sizeY < 0) {
        $element.addClass('gridster-auto-height-enabled');
        updateHeight();

        $scope.$on('$destroy', () => {
          destroyed = true;
        });
      }
    },
  };
}

export default function init(ngModule) {
  ngModule.factory('Title', TitleService);
  ngModule.directive('title', title);
  ngModule.directive('compareTo', compareTo);
  ngModule.directive('autofocus', autofocus);
  ngModule.directive('gridsterAutoHeight', gridsterAutoHeight);
}
