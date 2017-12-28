import debug from 'debug';
import template from './template.html';

const logger = debug('redash:app-view');

export default function init(ngModule) {
  let customHandler = null;

  ngModule.factory('$exceptionHandler', () => function exceptionHandler(exception) {
    if (customHandler) {
      customHandler(exception);
    } else {
      // eslint-disable-next-line no-console
      console.error(exception);
    }
  });

  ngModule.component('appView', {
    template,
    controller($rootScope, $route, Auth) {
      this.showHeaderAndFooter = false;

      this.error = null;

      customHandler = (error) => {
        if (!(error instanceof Error)) {
          if (error.status && error.data) {
            switch (error.status) {
              case 403: error = new Error(''); break;
              default: error = new Error(error.data.message); break;
            }
          }
        }
        this.error = error;
        // eslint-disable-next-line no-console
        console.error(error);
      };

      $rootScope.$on('$routeChangeStart', (event, route) => {
        if (route.$$route.authenticated) {
          // For routes that need authentication, check if session is already
          // loaded, and load it if not.
          logger('Requested authenticated route: ', route);
          if (Auth.isAuthenticated()) {
            this.showHeaderAndFooter = true;
          } else {
            event.preventDefault();
            // Auth.requireSession resolves only if session loaded
            Auth.requireSession().then(() => {
              this.showHeaderAndFooter = true;
              $route.reload();
            });
          }
        } else {
          this.showHeaderAndFooter = false;
        }
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        this.error = null;
      });

      $rootScope.$on('$routeChangeError', (event, current, previous, rejection) => {
        throw rejection;
      });
    },
  });
}
