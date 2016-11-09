angular.module('redash', [
  'redash.directives',
  'redash.admin_controllers',
  'redash.controllers',
  'redash.filters',
  'redash.services',
  'redash.visualization',
  'plotly',
  'angular-growl',
  'angularMoment',
  'ui.bootstrap',
  'ui.sortable',
  'smartTable.table',
  'ngResource',
  'ngRoute',
  'ui.select',
  'ui.ace',
  'naif.base64',
  'ui.bootstrap.showErrors',
  'angularResizable',
  'ngSanitize',
  'vs-repeat'
]).config(['$routeProvider', '$locationProvider', '$compileProvider', 'growlProvider', 'uiSelectConfig', '$httpProvider',
  function ($routeProvider, $locationProvider, $compileProvider, growlProvider, uiSelectConfig, $httpProvider) {

    if (currentUser.apiKey) {
      $httpProvider.defaults.headers.common.Authorization = 'Key ' + currentUser.apiKey;
    }

    $routeProvider.when('/public/dashboards/:token', {
      templateUrl: '/views/dashboard.html',
      controller: 'PublicDashboardCtrl',
      reloadOnSearch: false
    });

    $routeProvider.when('/queries/search', {
      templateUrl: '/views/queries_search_results.html',
      controller: 'QuerySearchCtrl',
      reloadOnSearch: true,
    });
    $routeProvider.otherwise({
      redirectTo: '/'
    });


  }
]);
