import debug from 'debug';
import PromiseRejectionError from '@/lib/promise-rejection-error';
import { ErrorHandler } from './error-handler';
import template from './template.html';

const logger = debug('redash:app-view');

const handler = new ErrorHandler();

const layouts = {
  default: {
    showHeader: true,
    showFooter: true,
    bodyClass: false,
  },
  darkTheme: {
    bodyClass: 'dark-theme',
  },
  fixed: {
    showHeader: true,
    showFooter: false,
    bodyClass: 'fixed-layout',
  },
  defaultSignedOut: {
    showHeader: false,
    showFooter: false,
  },
};

function selectLayout(route, theme = 'light') {
  let layout = layouts.default;
  if (route.layout) {
    layout = layouts[route.layout] || layouts.default;
  } else if (!route.authenticated) {
    layout = layouts.defaultSignedOut;
  }

  if (theme === 'dark') {
    layout = { ...layout, ...layouts.darkTheme };
  }
  return layout;
}

class AppViewComponent {
  constructor($rootScope, $route, Auth) {
    this.$rootScope = $rootScope;
    this.showHeaderAndFooter = false;
    this.layout = layouts.defaultSignedOut;
    this.handler = handler;
    this.theme = 'light';

    $rootScope.$on('$routeChangeStart', (event, route) => {
      this.handler.reset();

      // In case we're handling $routeProvider.otherwise call, there will be no
      // $$route.
      const $$route = route.$$route || { authenticated: true };
      this.theme = route.params.theme || 'light';

      if ($$route.authenticated) {
        // For routes that need authentication, check if session is already
        // loaded, and load it if not.
        logger('Requested authenticated route: ', route);
        if (!Auth.isAuthenticated()) {
          event.preventDefault();
          // Auth.requireSession resolves only if session loaded
          Auth.requireSession().then(() => {
            this.applyLayout($$route);
            $route.reload();
          });
        }
      }
    });

    $rootScope.$on('$routeChangeSuccess', (event, route) => {
      const $$route = route.$$route || { authenticated: true };
      this.applyLayout($$route);
    });

    $rootScope.$on('$routeChangeError', (event, current, previous, rejection) => {
      const $$route = current.$$route || { authenticated: true };
      this.applyLayout($$route);
      throw new PromiseRejectionError(rejection);
    });
  }

  applyLayout(route) {
    this.layout = selectLayout(route, this.theme);
    this.$rootScope.bodyClass = this.layout.bodyClass;
  }
}

export default function init(ngModule) {
  ngModule.factory(
    '$exceptionHandler',
    () => function exceptionHandler(exception) {
      handler.process(exception);
    },
  );

  ngModule.component('appView', {
    template,
    controller: AppViewComponent,
  });
}

init.init = true;
