(function () {
    var DashboardCtrl = function ($scope, $routeParams, $http, Dashboard) {
        $scope.dashboard = Dashboard.get({slug: $routeParams.dashboardSlug}, function(dashboard) {
            $scope.$parent.pageTitle = dashboard.name;
        });
    };

    var WidgetCtrl = function ($scope, $http, Query) {
        $scope.deleteWidget = function() {
            if (!confirm('Are you sure you want to remove "' + $scope.widget.query.name + '" from the dashboard?')) {
                return;
            }

            $http.delete('/api/widgets/' + $scope.widget.id).success(function() {
                $scope.dashboard.widgets = _.map($scope.dashboard.widgets, function(row) {
                    return _.filter(row, function(widget) {
                        return widget.id != $scope.widget.id;
                    })
                });
            });
        }

        $scope.query = new Query($scope.widget.query);
        $scope.queryResult = $scope.query.getQueryResult();

        $scope.updateTime = (new Date($scope.queryResult.getUpdatedAt())).toISOString();
        $scope.nextUpdateTime = moment(new Date(($scope.query.updated_at + $scope.query.ttl + $scope.query.runtime + 300) * 1000)).fromNow();

        $scope.updateTime = '';
    }

    var QueryFiddleCtrl = function ($scope, $routeParams, $http, $location, growl, notifications, Query) {
        $scope.$parent.pageTitle = "Query Fiddle";

        $scope.tabs = [{'key': 'table', 'name': 'Table'}, {'key': 'chart', 'name': 'Chart'},
                       {'key': 'pivot', 'name': 'Pivot Table'}, {'key': 'cohort', 'name': 'Cohort'}];

        $scope.lockButton = function (lock) {
            $scope.queryExecuting = lock;
        };

        $scope.formatQuery = function() {
            $scope.editorOptions.readOnly = 'nocursor';

            $http.post('/api/queries/format', {'query': $scope.query.query}).success(function(response) {
                $scope.query.query = response;
                $scope.editorOptions.readOnly = false;
            })
        }

        $scope.saveQuery = function (duplicate, oldId) {
            if (!oldId) {
                oldId = $scope.query.id;
            }
            delete $scope.query.latest_query_data;
            $scope.query.$save(function (q) {
                if (duplicate) {
                    growl.addInfoMessage("Query duplicated.", {ttl: 2000});
                } else{
                    growl.addSuccessMessage("Query saved.", {ttl: 2000});
                }

                if (oldId != q.id) {
                    if (oldId == undefined) {
                        $location.path($location.path().replace('new', q.id)).replace();
                    } else {
                        // TODO: replace this with a safer method
                        $location.path($location.path().replace(oldId, q.id)).replace();
                    }
                }
            });
        };

        $scope.duplicateQuery = function () {
            var oldId = $scope.query.id;
            $scope.query.id = null;
            $scope.query.ttl = -1;

            $scope.saveQuery(true, oldId);
        };

        // Query Editor:
        $scope.editorOptions = {
            mode: 'text/x-sql',
            lineWrapping: true,
            lineNumbers: true,
            readOnly: false,
            matchBrackets: true,
            autoCloseBrackets: true
        };

        $scope.refreshOptions = [
            {value: -1, name: 'No Refresh'},
        ]

        _.each(_.range(1, 13), function(i) {
            $scope.refreshOptions.push({value: i*3600, name: 'Every ' + i + 'h'});
        })

        $scope.refreshOptions.push({value: 24*3600, name: 'Every 24h'});
        $scope.refreshOptions.push({value: 7*24*3600, name: 'Once a week'});

        $scope.$watch('queryResult && queryResult.getError()', function (newError, oldError) {
            if (newError == undefined) {
                return;
            }

            if (oldError == undefined && newError != undefined) {
                $scope.lockButton(false);
            }
        });

        $scope.$watch('queryResult && queryResult.getData()', function (data, oldData) {
            if (!data) {
                return;
            }

            if ($scope.queryResult.getId() == null) {
                $scope.dataUri = "";
            } else {
                $scope.dataUri = '/api/query_results/' + $scope.queryResult.getId() + '.csv';
                $scope.dataFilename = $scope.query.name.replace(" ", "_") + moment($scope.queryResult.getUpdatedAt()).format("_YYYY_MM_DD") + ".csv";
            }
        });

        $scope.$watch("queryResult && queryResult.getStatus()", function (status) {
            if (!status) {
                return;
            }

            if (status == "done") {
                if ($scope.query.id && $scope.query.latest_query_data_id != $scope.queryResult.getId() &&
                    $scope.query.query_hash == $scope.queryResult.query_result.query_hash) {
                    Query.save({'id': $scope.query.id, 'latest_query_data_id': $scope.queryResult.getId()})
                }
                $scope.query.latest_query_data_id = $scope.queryResult.getId();

                notifications.showNotification("re:dash", $scope.query.name + " updated.");

                $scope.lockButton(false);
            }
        });

        if ($routeParams.queryId != undefined) {
            $scope.query = Query.get({id: $routeParams.queryId}, function() {
                $scope.queryResult = $scope.query.getQueryResult();
            });
        } else {
            $scope.query = new Query({query: "", name: "New Query", ttl: -1, user: currentUser.name});
            $scope.lockButton(false);
        }

        $scope.$watch('query.name', function() {
            $scope.$parent.pageTitle = $scope.query.name;
        });

        $scope.executeQuery = function() {
            $scope.queryResult = $scope.query.getQueryResult(0);
            $scope.lockButton(true);
            $scope.cancelling = false;
        }

        $scope.cancelExecution = function() {
            $scope.cancelling = true;
            $scope.queryResult.cancelExecution();
        }

    }

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
                    return query.user == currentUser.name && query.name != 'New Query';
                } else if ($scope.selectedTab.key == 'drafts') {
                    return query.user == currentUser.name && query.name == 'New Query';
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
                'map': 'user'
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
        })
    }

    var MainCtrl = function ($scope, Dashboard, notifications) {
        $scope.dashboards = [];
        $scope.reloadDashboards = function() {
            Dashboard.query(function (dashboards) {
                $scope.dashboards = _.sortBy(dashboards, "name");
                $scope.groupedDashboards = _.groupBy($scope.dashboards, function(d) {
                    parts = d.name.split(":");
                    if (parts.length == 1) {
                        return "Other";
                    }
                    return parts[0];
                });
                $scope.otherDashboards = $scope.groupedDashboards['Other'] || [];
                delete $scope.groupedDashboards['Other'];
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
        .controller('DashboardCtrl', ['$scope', '$routeParams', '$http', 'Dashboard', DashboardCtrl])
        .controller('WidgetCtrl', ['$scope', '$http', 'Query', WidgetCtrl])
        .controller('QueriesCtrl', ['$scope', '$http', '$location', '$filter', 'Query', QueriesCtrl])
        .controller('QueryFiddleCtrl', ['$scope', '$routeParams', '$http', '$location', 'growl', 'notifications', 'Query', QueryFiddleCtrl])
        .controller('IndexCtrl', ['$scope', 'Dashboard', IndexCtrl])
        .controller('MainCtrl', ['$scope', 'Dashboard', 'notifications', MainCtrl]);
})();
