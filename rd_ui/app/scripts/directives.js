var directives = angular.module('redash.directives', []);
directives.directive('rdTabs', ['$location', '$rootScope', function($location, $rootScope) {
    return {
        restrict: 'E',
        scope: {
            tabsCollection: '=',
            selectedTab: '='
        },
        template: '<ul class="nav nav-tabs"><li ng-class="{active: tab==selectedTab}" ng-repeat="tab in tabsCollection"><a href="#{{tab.key}}">{{tab.name}}</a></li></ul>',
        replace: true,
        link: function($scope, element, attrs) {
            $scope.selectTab = function(tabKey) {
                $scope.selectedTab  = _.find($scope.tabsCollection, function(tab) { return tab.key == tabKey; });
            }

            $scope.$watch(function() { return $location.hash()}, function(hash) {
                if (hash) {
                    $scope.selectTab($location.hash());
                } else {
                    $scope.selectTab($scope.tabsCollection[0].key);
                }
            });
        }
    }
}])

directives.directive('editDashboardForm', ['$http', '$location', '$timeout', 'Dashboard', function($http, $location, $timeout, Dashboard) {
    return {
        restrict: 'E',
        scope: {
            dashboard: '='
        },
        templateUrl: '/views/edit_dashboard.html',
        replace: true,
        link: function($scope, element, attrs) {
            $scope.$watch('dashboard.widgets', function() {
                if ($scope.dashboard.widgets) {
                    $scope.layout = [];
                    _.each($scope.dashboard.widgets, function(row, rowIndex) {
                        _.each(row, function(widget, colIndex) {
                            $scope.layout.push({
                                id: widget.id,
                                col: colIndex+1,
                                row: rowIndex+1,
                                ySize: 1,
                                xSize: widget.width,
                                name: widget.query.name
                            })
                        })
                    });

                    $timeout(function () {
                        $(".gridster ul").gridster({
                            widget_margins: [5, 5],
                            widget_base_dimensions: [260, 100],
                            min_cols: 2,
                            max_cols: 2,
                            serialize_params: function ($w, wgd) {
                                return { col: wgd.col, row: wgd.row, id: $w.data('widget-id') }
                            }
                        });
                    });
                }
            });

            $scope.saveDashboard = function() {
                $scope.saveInProgress = true;
                // TODO: we should use the dashboard service here.
                if ($scope.dashboard.id) {
                    var positions = $(element).find('.gridster ul').data('gridster').serialize();
                    var layout = [];
                    _.each(_.sortBy(positions, function (pos) {
                        return pos.row * 10 + pos.col;
                    }), function (pos) {
                        var row = pos.row - 1;
                        var col = pos.col - 1;
                        layout[row] = layout[row] || [];
                        if (col > 0 && layout[row][col - 1] == undefined) {
                            layout[row][col - 1] = pos.id;
                        } else {
                            layout[row][col] = pos.id;
                        }

                    });
                    $scope.dashboard.layout = layout;

                    layout = JSON.stringify(layout);
                    $http.post('/api/dashboards/' + $scope.dashboard.id, {'name': $scope.dashboard.name, 'layout': layout}).success(function(response) {
                        $scope.dashboard = new Dashboard(response);
                        $scope.saveInProgress = false;
                        $(element).modal('hide');
                    })
                } else {
                    $http.post('/api/dashboards', {'name': $scope.dashboard.name}).success(function(response) {
                        $(element).modal('hide');
                        $location.path('/dashboard/' + response.slug).replace();
                    })
                }
            }

        }
    }
}])


directives.directive('newWidgetForm', ['$http', function($http) {
    return {
        restrict: 'E',
        scope: {
            dashboard: '='
        },
        templateUrl: '/views/new_widget_form.html',
        replace: true,
        link: function($scope, element, attrs) {
            $scope.widgetTypes = [{name: 'Chart', value: 'chart'}, {name: 'Table', value: 'grid'}, {name: 'Cohort', value: 'cohort'}];
            $scope.widgetSizes = [{name: 'Regular Size', value: 1}, {name: 'Double Size', value: 2}];

            var reset = function() {
                $scope.saveInProgress = false;
                $scope.widgetType = 'chart';
                $scope.widgetSize = 1;
                $scope.queryId = null;
            }

            reset();

            $scope.saveWidget = function() {
                $scope.saveInProgress = true;

                var widget = {
                    'query_id': $scope.queryId,
                    'dashboard_id': $scope.dashboard.id,
                    'type': $scope.widgetType,
                    'options': {},
                    'width': $scope.widgetSize
                }

                $http.post('/api/widgets', widget).success(function(response) {
                    // update dashboard layout
                    $scope.dashboard.layout = response['layout'];
                    if (response['new_row']) {
                        $scope.dashboard.widgets.push([response['widget']]);
                    } else {
                        $scope.dashboard.widgets[$scope.dashboard.widgets.length-1].push(response['widget']);
                    }

                    // close the dialog
                    $('#add_query_dialog').modal('hide');
                    reset();
                })
            }

        }
    }
}])

// From: http://jsfiddle.net/joshdmiller/NDFHg/
directives.directive('editInPlace', function () {
    return {
        restrict: 'E',
        scope: { value: '=' },
        template: '<span ng-click="edit()" ng-bind="value"></span><input ng-model="value"></input>',
        link: function ($scope, element, attrs) {
            // Let's get a reference to the input element, as we'll want to reference it.
            var inputElement = angular.element(element.children()[1]);

            // This directive should have a set class so we can style it.
            element.addClass('edit-in-place');

            // Initially, we're not editing.
            $scope.editing = false;

            // ng-click handler to activate edit-in-place
            $scope.edit = function () {
                $scope.editing = true;

                // We control display through a class on the directive itself. See the CSS.
                element.addClass('active');

                // And we must focus the element.
                // `angular.element()` provides a chainable array, like jQuery so to access a native DOM function,
                // we have to reference the first element in the array.
                inputElement[0].focus();
            };

            $(inputElement).blur(function() {
                $scope.editing = false;
                element.removeClass('active');
            })
        }
    };
});

directives.directive('rdTimer', ['$timeout', function ($timeout) {
    return {
        restrict: 'E',
        scope: { timestamp: '=' },
        template: '{{currentTime}}',
        controller: ['$scope' ,function ($scope) {
            $scope.currentTime = "00:00:00";
            var currentTimeout = null;

            var updateTime = function() {
                $scope.currentTime = moment(moment() - moment($scope.timestamp)).utc().format("HH:mm:ss")
                currentTimeout = $timeout(updateTime, 1000);
            }

            var cancelTimer = function() {
                if (currentTimeout) {
					$timeout.cancel(currentTimeout);
					currentTimeout = null;
				}
            }

            updateTime();

            $scope.$on('$destroy', function () {
				cancelTimer();
			});
        }]
    };
}]);