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
    'naif.base64',
    'ui.bootstrap.showErrors',
    'ngSanitize'
  ]).config(['$routeProvider', '$locationProvider', '$compileProvider', 'growlProvider', 'uiSelectConfig',
    function ($routeProvider, $locationProvider, $compileProvider, growlProvider, uiSelectConfig) {
      function getQuery(Query, $route) {
        var query = Query.get({'id': $route.current.params.queryId });
        return query.$promise;
      };

      uiSelectConfig.theme = "bootstrap";

      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|http|data):/);
      $locationProvider.html5Mode(true);
      growlProvider.globalTimeToLive(2000);

      $routeProvider.when('/embed/query/:queryId/visualization/:visualizationId', {
        templateUrl: '/views/visualization-embed.html',
        controller: 'EmbedCtrl',
        reloadOnSearch: false
      });
      $routeProvider.otherwise({
        redirectTo: '/embed'
      });


    }
  ])
   .controller('EmbedCtrl', ['$scope', function ($scope) {} ])
   .controller('EmbeddedVisualizationCtrl', ['$scope', '$location', 'Query', 'QueryResult',
     function ($scope, $location, Query, QueryResult) {
       $scope.showQueryDescription = $location.search()['showDescription'];
       $scope.embed = true;
       $scope.visualization = visualization;
       $scope.query = visualization.query;
       $scope.apiKey = $location.search()['api_key'];
       query = new Query(visualization.query);
       $scope.queryResult = new QueryResult({query_result: query_result});
     }])
   ;
