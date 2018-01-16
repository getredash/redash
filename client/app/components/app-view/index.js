import debug from 'debug';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import { ErrorHandler } from './error-handler';
import template from './template.html';

const logger = debug('redash:app-view');

const handler = new ErrorHandler();

export default function init(ngModule) {
  ngModule.factory('$exceptionHandler', () => function exceptionHandler(exception) {
    handler.process(exception);
  });

  ngModule.component('appView', {
    template,
    controller($rootScope, $route, Auth) {
      this.showHeaderAndFooter = false;

      this.handler = handler;

      $rootScope.$on('$routeChangeStart', (event, route) => {
        this.handler.reset();
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

      $rootScope.$on('$routeChangeError', (event, current, previous, rejection) => {
        throw new PromiseRejectionError(rejection);
      });
    },
  });
}
