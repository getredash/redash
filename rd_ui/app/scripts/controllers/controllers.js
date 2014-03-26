(function () {
    var QueriesCtrl = function($scope, $http, $location, $filter, Query) {
        $scope.$parent.pageTitle = "All Queries";
        $scope.gridConfig = {
            isPaginationEnabled: true,
            itemsByPage: 50,
            maxSize: 8,
            isGlobalSearchActivated: true
        }

        $scope.allQueries = [];
        $scope.queries = [];

        var dateFormatter = function (value) {
            if (!value) return "-";
            return value.format("DD/MM/YY HH:mm");
        }

        var filterQueries = function() {
            $scope.queries = _.filter($scope.allQueries, function(query) {
                if (!$scope.selectedTab) {
                    return false;
                }

                if ($scope.selectedTab.key == 'my') {
                    return query.user.id == currentUser.id && query.name != 'New Query';
                } else if ($scope.selectedTab.key == 'drafts') {
                    return query.user.id == currentUser.id && query.name == 'New Query';
                }

                return query.name != 'New Query';
            });
        }

        Query.query(function(queries) {
            $scope.allQueries = _.map(queries, function(query) {
                query.created_at = moment(query.created_at);
                query.last_retrieved_at = moment(query.last_retrieved_at);
                return query;
            });

            filterQueries();
        });

        $scope.gridColumns = [
            {
                "label": "Name",
                "map": "name",
                "cellTemplateUrl": "/views/queries_query_name_cell.html"
            },
            {
                'label': 'Created By',
                'map': 'user.name'
            },
            {
                'label': 'Created At',
                'map': 'created_at',
                'formatFunction': dateFormatter
            },
            {
                'label': 'Runtime (avg)',
                'map': 'avg_runtime',
                'formatFunction': function(value) {
                    return $filter('durationHumanize')(value);
                }
            },
            {
                'label': 'Runtime (min)',
                'map': 'min_runtime',
                'formatFunction': function(value) {
                    return $filter('durationHumanize')(value);
                }
            },
            {
                'label': 'Runtime (max)',
                'map': 'max_runtime',
                'formatFunction': function(value) {
                    return $filter('durationHumanize')(value);
                }
            },
            {
                'label': 'Last Executed At',
                'map': 'last_retrieved_at',
                'formatFunction': dateFormatter
            },
            {
                'label': 'Times Executed',
                'map': 'times_retrieved'
            },
            {
                'label': 'Update Schedule',
                'map': 'ttl',
                'formatFunction': function(value) {
                    return $filter('refreshRateHumanize')(value);
                }
            }
        ]
        $scope.tabs = [{"name": "My Queries", "key": "my"}, {"key": "all", "name": "All Queries"}, {"key": "drafts", "name": "Drafts"}];

        $scope.$watch('selectedTab', function(tab) {
            if (tab) {
                $scope.$parent.pageTitle =  tab.name;
            }

            filterQueries();
        });
    }

    var MainCtrl = function ($scope, Dashboard, notifications) {
        $scope.dashboards = [];
        $scope.reloadDashboards = function() {
            Dashboard.query(function (dashboards) {
                $scope.dashboards = _.sortBy(dashboards, "name");
                $scope.allDashboards = _.groupBy($scope.dashboards, function(d) {
                    parts = d.name.split(":");
                    if (parts.length == 1) {
                        return "Other";
                    }
                    return parts[0];
                });
                $scope.otherDashboards = $scope.allDashboards['Other'] || [];
                $scope.groupedDashboards = _.omit($scope.allDashboards, 'Other');
            });
        }

        $scope.reloadDashboards();

        $scope.currentUser = currentUser;
        $scope.newDashboard = {
            'name': null,
            'layout': null
        }

        $(window).click(function () {
            notifications.getPermissions();
        });
    }

    var IndexCtrl = function($scope, Dashboard) {
        $scope.$parent.pageTitle = "Home";

        $scope.archiveDashboard = function(dashboard) {
            if (confirm('Are you sure you want to delete "' + dashboard.name + '" dashboard?')) {
                dashboard.$delete(function() {
                    $scope.$parent.reloadDashboards();
                });
            }
        }
    }

    angular.module('redash.controllers', [])
        .controller('QueriesCtrl', ['$scope', '$http', '$location', '$filter', 'Query', QueriesCtrl])
        .controller('IndexCtrl', ['$scope', 'Dashboard', IndexCtrl])
        .controller('MainCtrl', ['$scope', 'Dashboard', 'notifications', MainCtrl]);
})();
