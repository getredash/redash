export default function (ngModule) {
  ngModule.component('routeStatus', {
    template: '<overlay ng-if="$ctrl.permissionDenied">You do not have permission to load this page.',

    controller($rootScope) {
      this.permissionDenied = false;

      $rootScope.$on('$routeChangeSuccess', () => {
        this.permissionDenied = false;
      });

      $rootScope.$on('$routeChangeError', (event, current, previous, rejection) => {
        if (rejection.status === 403) {
          this.permissionDenied = true;
        }
      });
    },
  });
}
