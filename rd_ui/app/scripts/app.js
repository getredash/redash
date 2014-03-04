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
    'angular-growl',
    'angularMoment',
    'ui.bootstrap',
    'smartTable.table',
    'ngResource',
    'ngRoute'
]).config(['$routeProvider', '$locationProvider', '$compileProvider', 'growlProvider',
    function($routeProvider, $locationProvider, $compileProvider, growlProvider) {

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
            templateUrl: '/views/queryfiddle.html',
            controller: 'QueryFiddleCtrl',
            reloadOnSearch: false
        });
        $routeProvider.when('/queries/:queryId', {
            templateUrl: '/views/queryfiddle.html',
            controller: 'QueryFiddleCtrl',
            reloadOnSearch: false
        });
        $routeProvider.when('/admin/status', {
            templateUrl: '/views/admin_status.html',
            controller: 'AdminStatusCtrl'
        });
        $routeProvider.when('/', {
            templateUrl: '/views/index.html',
            controller: 'IndexCtrl'
        });
        $routeProvider.otherwise({
            redirectTo: '/'
        });

        Highcharts.setOptions({
            colors: ["#4572A7", "#AA4643", "#89A54E", "#80699B", "#3D96AE",
                        "#DB843D", "#92A8CD", "#A47D7C", "#B5CA92"]
        });
    }
]);