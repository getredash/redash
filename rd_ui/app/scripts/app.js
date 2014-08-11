angular.module('redash', [
    'redash.directives',
    'redash.admin_controllers',
    'redash.controllers',
    'redash.filters',
    'redash.services',
    'redash.renderers',
    'redash.visualization',
    'ui.codemirror',
    'highchart',
    'ui.select2',
    'angular-growl',
    'angularMoment',
    'ui.bootstrap', 
    'smartTable.table',
    'ngResource',
    'ngRoute'
  ]).config(['$routeProvider', '$locationProvider', '$compileProvider', 'growlProvider',
    function ($routeProvider, $locationProvider, $compileProvider, growlProvider) {
      if (featureFlags.clientSideMetrics) {
        Bucky.setOptions({
          host: '/api/metrics'
        });

        Bucky.requests.monitor('ajax_requsts');
        Bucky.requests.transforms.enable('dashboards', /dashboard\/[\w-]+/ig, '/dashboard');
      }

      function getQuery(Query, $route) {
        var query = Query.get({'id': $route.current.params.queryId });
        return query.$promise;
      };

      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|http|data):/);
      $locationProvider.html5Mode(true);
      growlProvider.globalTimeToLive(2000);

      $routeProvider.when('/dashboard/:dashboardSlug', {
        templateUrl: '/views/dashboard.html',
        controller: 'DashboardCtrl'
      });      
      $routeProvider.when('/queries', {
        templateUrl: '/views/queries.html',
        controller: 'QueriesCtrl',
        reloadOnSearch: false
      });
      $routeProvider.when('/queries/new', {
        templateUrl: '/views/query.html',
        controller: 'QuerySourceCtrl',
        reloadOnSearch: false,
        resolve: {
          'query': ['Query', function newQuery(Query) {
            return Query.newQuery();
          }]
        }
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
      $routeProvider.when('/admin/status', {
        templateUrl: '/views/admin_status.html',
        controller: 'AdminStatusCtrl'
      });
      $routeProvider.when('/admin/status', {
        templateUrl: '/views/admin_status.html',
        controller: 'AdminStatusCtrl'
      });
      $routeProvider.when('/admin/users', {
        templateUrl: '/views/admin_users.html',
        controller: 'AdminUsersCtrl'
      });      
      $routeProvider.when('/admin/user/:id', {
        templateUrl: '/views/admin_user_form.html',
        controller: 'AdminUserFormCtrl'
      });
      $routeProvider.when('/admin/user-view/:id', {
        templateUrl: '/views/admin_view_user.html',
        controller: 'AdminViewUserCtrl'
      });
      $routeProvider.when('/admin/groups', {
        templateUrl: '/views/admin_groups.html',
        controller: 'AdminGroupsCtrl'
      });
      $routeProvider.when('/admin/group/:id', {
        templateUrl: '/views/admin_form.html',
        controller: 'AdminGroupFormCtrl'
      });   
      $routeProvider.when('/admin/group-view/:id', {
        templateUrl: '/views/admin_view_group.html',
        controller: 'AdminViewGroupCtrl'
      });        
      $routeProvider.when('/admin/group', {
        templateUrl: '/views/admin_form.html',
        controller: 'AdminGroupFormCtrl'
      });
      $routeProvider.when('/', {
        templateUrl: '/views/index.html',
        controller: 'IndexCtrl'
      });
      $routeProvider.otherwise({
        redirectTo: '/'
      });
    }
  ]);