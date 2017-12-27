import template from './template.html';

export default function init(ngModule) {
  ngModule.component('appView', {
    template,
    controller($rootScope, $route, Auth) {
      this.showHeaderAndFooter = false;

      $rootScope.$on('$routeChangeStart', (event, route) => {
        if (route.$$route.authenticated) {
          // For routes that need authentication, check if session is already
          // loaded, and load it if not.
          Auth.logger('Requested authenticated route: ', route);
          if (Auth.isAuthenticated()) {
            this.showHeaderAndFooter = true;
          } else {
            event.preventDefault();
            Auth.loadSession().then(() => {
              if (Auth.isAuthenticated()) {
                this.showHeaderAndFooter = true;
                Auth.logger('Loaded session');
                $route.reload();
              } else {
                throw new Error('Need to login');
              }
            }).catch(() => {
              Auth.logger('Need to login, redirecting');
              Auth.login();
            });
          }
        } else {
          this.showHeaderAndFooter = false;
        }
      });

      this.error = null;

      $rootScope.$on('appViewError', (event, error) => {
        if ((error !== null) && (error !== undefined) && (error !== '')) {
          this.error = error instanceof Error ? error : new Error('' + error);
        } else {
          this.error = null;
        }
      });

      $rootScope.$on('$routeChangeSuccess', () => {
        $rootScope.$broadcast('appViewError', null);
      });

      $rootScope.$on('appViewRejection', (event, rejection) => {
        let error = null;
        switch (rejection.status) {
          case 403: error = new Error(''); break;
          default: error = new Error(rejection.data.message); break;
        }
        $rootScope.$broadcast('appViewError', error);
      });

      $rootScope.$on('$routeChangeError', (event, current, previous, rejection) => {
        $rootScope.$broadcast('appViewRejection', rejection);
      });
    },
  });
}
