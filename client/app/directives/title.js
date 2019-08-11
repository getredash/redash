import { logger } from './utils';

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

export default function init(ngModule) {
  ngModule
    .factory('Title', TitleService)
    .directive('title', title);
}

init.init = true;
