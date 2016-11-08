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
    function getQuery(Query, $route) {
      var query = Query.get({'id': $route.current.params.queryId});
      return query.$promise;
    };

    if (currentUser.apiKey) {
      $httpProvider.defaults.headers.common.Authorization = 'Key ' + currentUser.apiKey;
    }

    $routeProvider.when('/public/dashboards/:token', {
      templateUrl: '/views/dashboard.html',
      controller: 'PublicDashboardCtrl',
      reloadOnSearch: false
    });
    $routeProvider.when('/queries/new', {
      templateUrl: '/views/query.html',
      controller: 'QuerySourceCtrl',
      reloadOnSearch: false,
      resolve: {
        'query': ['Query', function newQuery(Query) {
          return Query.newQuery();
        }],
        'dataSources': ['DataSource', function (DataSource) {
          return DataSource.query().$promise
        }]
      }
    });
    $routeProvider.when('/queries/search', {
      templateUrl: '/views/queries_search_results.html',
      controller: 'QuerySearchCtrl',
      reloadOnSearch: true,
    });
    $routeProvider.when('/queries/:queryId', {
      templateUrl: '/views/query.html',
      controller: 'QueryViewCtrl',
      reloadOnSearch: false,
      resolve: {
        'query': ['Query', '$route', getQuery]
      }
    });
    $routeProvider.when('/queries/:queryId/source', {
      templateUrl: '/views/query.html',
      controller: 'QuerySourceCtrl',
      reloadOnSearch: false,
      resolve: {
        'query': ['Query', '$route', getQuery]
      }
    });
    $routeProvider.when('/data_sources/:dataSourceId', {
      templateUrl: '/views/data_sources/edit.html',
      controller: 'DataSourceCtrl'
    });
    $routeProvider.when('/data_sources', {
      templateUrl: '/views/data_sources/list.html',
      controller: 'DataSourcesCtrl'
    });

    $routeProvider.when('/destinations/:destinationId', {
      templateUrl: '/views/destinations/edit.html',
      controller: 'DestinationCtrl'
    });
    $routeProvider.when('/destinations', {
      templateUrl: '/views/destinations/list.html',
      controller: 'DestinationsCtrl'
    });

    $routeProvider.when('/groups/:groupId/data_sources', {
      templateUrl: '/views/groups/show_data_sources.html',
      controller: 'GroupDataSourcesCtrl'
    });
    $routeProvider.when('/groups/:groupId', {
      templateUrl: '/views/groups/show.html',
      controller: 'GroupCtrl'
    });
    $routeProvider.when('/groups', {
      templateUrl: '/views/groups/list.html',
      controller: 'GroupsCtrl'
    });
    $routeProvider.otherwise({
      redirectTo: '/'
    });


  }
]);
