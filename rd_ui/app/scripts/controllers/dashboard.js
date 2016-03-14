(function() {
    var DashboardCtrl = function($scope, Events, Widget, FavoriteDashboards, FileSaver, $routeParams, $location, $http, $timeout, $q, Dashboard, Parameters) {

      /**
      * toggleFavorite Add/Remove the current dashboard to favorite
      */
      $scope.toggleFavorite = function(value) {
        FavoriteDashboards.updateFavorite({dashboardId: $scope.dashboard.id, flag: value});
      };

      /**
       * changeCollapseValues for each widget sets the value received by param
       * @param  {boolean} value
       */
      $scope.changeCollapseValues = function(value) {
        if ($scope.dashboard.widgets !== undefined) {
          _.forEach($scope.dashboard.widgets, function(widget) {
            _.forEach(widget, function(w) {
              w.isCollapsed = value;
            })
          })
        }
      };

      /**
       * collapseValue Get the collapse value depending if the first widget is visualization
       *
       */
      $scope.collapseValue = function() {
        if ($scope.dashboard.widgets !== undefined) {
          _.forEach($scope.dashboard.widgets, function(widget) {
            _.forEach(widget, function(w) {
              if (w.visualization) {
                w.isCollapsed = false;
              }
            });
          });
        }
      };

      /**
       * exportWidgets For Each selected visualization widget export its svg to a pdf
       */
      $scope.exportWidgetsToPdf = function() {
        var $chart,
          data = {data: []};
        //generate data to be exported for every widget that is marked for export
        _.forEach($scope.dashboard.widgets, function(widget) {
          _.forEach(widget, function(w) {
            if (w.options.exportable !== undefined &&
              w.options.exportable.isExportable &&
              w.query !== undefined &&
              w.query.queryResult !== undefined &&
              w.query.queryResult.filteredData !== undefined) {
              //to export charts, send SVG
              if (w.visualization && w.visualization.type==='CHART') {
                $chart = $('#' + w.id).find('div[data-highcharts-chart]');
                data.data.push({
                  name: (w.options.exportable.name || w.query.name) + '- ' + w.visualization.name,
                  data: $chart.highcharts().getSVG(),
                  type: 'SVG'
                });
              } else { //to export tables, send data
                data.data.push({
                  name: w.options.exportable.name || w.query.name,
                  data: {
                    columnNames: w.query.queryResult.columnNames,
                    rows: w.query.queryResult.filteredData
                  },
                  type: 'TABLE'
                });
              }

            }
          });
        });

        if (data.data.length) {
          $http({
            url: '/services/pdf/create',
            method: 'POST',
            data: data,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            responseType: 'arraybuffer'
          }).then(function(response) {
            var blob = new Blob([response.data], {
              type: 'application/pdf;charset=utf-8'
            });
            FileSaver.saveAs(blob, $scope.dashboard.name + '.pdf');
          });
        }
      };

      /**
       * excelFilters Creates a object that contains all the filters included on the dashboard
       * excluding some parameters like maxAge
       * @return {array}
       */
      var excelFilters = function() {
        var params = $location.search();
        var blacklist = Parameters.getBlackListParameters();
        var parameters = [];
        for (var propertyName in params) {
          if (!_.contains(blacklist, propertyName)) {
            var filter = {
              'Filters': propertyName.slice(0, 2) === 'p_' ? propertyName.slice(2) : propertyName,
              'Values': params[propertyName]
            };
            parameters.push(filter);
          }

        }
        if (parameters.length !== 0) {
          return parameters;
        }
        return null;
      };

      /**
       * exportWidgets For Each widget takes the data and exports that on a Sheet (xls)
       */
      $scope.exportWidgets = function() {

        var data = {
          name: $scope.dashboard.name,
          data: [],
          reports: []
        };

        var filtersUsed = excelFilters();
        var worksheet,
          option;

        //first tab is for filters used, if they are defined
        if (filtersUsed !== null) {
          filters = {
            columnNames: [
                'Filters',
                'Values'
            ],
            data: filtersUsed
          };
          data.filters = filters;
        }

        //generate data to be exported for every widget that is marked for export
        _.forEach($scope.dashboard.widgets, function(widget) {
          _.forEach(widget, function(w) {
            if (w.options.exportable !== undefined &&
              w.options.exportable.isExportable &&
              w.query !== undefined &&
              w.query.queryResult !== undefined &&
              w.query.queryResult.filteredData !== undefined) {
              // Creates a new option for adding the sheet name
              //
              if (w.options.exportable.name === undefined) {
                w.options.exportable.name = w.query.name;
              }
              worksheet = {
                option: {
                  sheet: w.options.exportable.name, //title
                  description: w.query.description, //subtitle
                  columnNames: w.query.queryResult.columnNames,
                  autofilter: true
                },
                data: w.query.queryResult.filteredData
              };
              data.reports.push(worksheet.option.sheet);
              data.data.push(worksheet);
            }
          });
        });
        if (data.data.length > 0) {
          $http({
            url: '/api/dashboard/generate_excel',
            method: 'POST',
            data: data, //this is your json data string
            headers: {
              'Content-type': 'application/json'
            },
            responseType: 'arraybuffer'
          }).success(function(response, status, headers, config) {
            var blob = new Blob([response], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
            });

            FileSaver.saveAs(blob, $scope.dashboard.name + '.xlsx');
          });
    }
  }

  $scope.refreshEnabled = false; $scope.refreshRate = 60;

  var loadDashboard = _.throttle(function() {
    $scope.dashboard = Dashboard.get({
      slug: $routeParams.dashboardSlug
    }, function(dashboard) {
      Events.record(currentUser, "view", "dashboard", dashboard.id);

      FavoriteDashboards.getFavoriteStatus({dashboardId: $scope.dashboard.id}, function(result) {
        $scope.isFavorite = result.flag;
      });

      $scope.$parent.pageTitle = dashboard.name;

      var promises = [];

      $scope.dashboard.widgets = _.map($scope.dashboard.widgets, function(row) {
        return _.map(row, function(widget) {
          var w = new Widget(widget);

          if (w.visualization) {
            promises.push(w.getQuery().getQueryResult().toPromise());
          }

          return w;
        });
      });

      $q.all(promises).then(function(queryResults) {
        var filters = {};
        _.each(queryResults, function(queryResult) {
          var queryFilters = queryResult.getFilters();
          _.each(queryFilters, function(queryFilter) {
            var hasQueryStringValue = _.has($location.search(), queryFilter.name);

            if (!(hasQueryStringValue || dashboard.dashboard_filters_enabled)) {
              // If dashboard filters not enabled, or no query string value given, skip filters linking.
              return;
            }

            if (!_.has(filters, queryFilter.name)) {
              var filter = _.extend({}, queryFilter);
              filters[filter.name] = filter;
              filters[filter.name].originFilters = [];
              if (hasQueryStringValue) {
                filter.current = $location.search()[filter.name];
              }

              $scope.$watch(function() {
                return filter.current
              }, function(value) {
                _.each(filter.originFilters, function(originFilter) {
                  originFilter.current = value;
                });
              });
            }

            // TODO: merge values.
            filters[queryFilter.name].originFilters.push(queryFilter);
          });
        });

        $scope.filters = _.values(filters);
      });


    }, function() {
      // error...
      // try again. we wrap loadDashboard with throttle so it doesn't happen too often.\
      // we might want to consider exponential backoff and also move this as a general solution in $http/$resource for
      // all AJAX calls.
      loadDashboard();
    });
  }, 1000);

  loadDashboard();

  var autoRefresh = function() {
    if ($scope.refreshEnabled) {
      $timeout(function() {
        Dashboard.get({
          slug: $routeParams.dashboardSlug
        }, function(dashboard) {
          var newWidgets = _.groupBy(_.flatten(dashboard.widgets), 'id');

          _.each($scope.dashboard.widgets, function(row) {
            _.each(row, function(widget, i) {
              var newWidget = newWidgets[widget.id];
              if (newWidget && newWidget[0].visualization.query.latest_query_data_id != widget.visualization.query.latest_query_data_id) {
                row[i] = new Widget(newWidget[0]);
              }
            });
          });

          autoRefresh();
        });

      }, $scope.refreshRate);
    }
  };

  $scope.archiveDashboard = function() {
    if (confirm('Are you sure you want to archive the "' + $scope.dashboard.name + '" dashboard?')) {
      Events.record(currentUser, "archive", "dashboard", $scope.dashboard.id);
      $scope.dashboard.$delete(function() {
        $scope.$parent.reloadDashboards();
      });
    }
  }

  $scope.triggerRefresh = function() {
    $scope.refreshEnabled = !$scope.refreshEnabled;

    Events.record(currentUser, "autorefresh", "dashboard", dashboard.id, {
      'enable': $scope.refreshEnabled
    });

    if ($scope.refreshEnabled) {
      var refreshRate = _.min(_.map(_.flatten($scope.dashboard.widgets), function(widget) {
        var schedule = widget.visualization.query.schedule;
        if (schedule === null || schedule.match(/\d\d:\d\d/) !== null) {
          return 60;
        }
        return widget.visualization.query.schedule;
      }));

      $scope.refreshRate = _.max([120, refreshRate * 2]) * 1000;

      autoRefresh();
    }
  };
};

var WidgetCtrl = function($scope, $location, Events, Query, Parameters) {

  Parameters.setParameters($location.search());

  $scope.deleteWidget = function() {
    if (!confirm('Are you sure you want to remove "' + $scope.widget.getName() + '" from the dashboard?')) {
      return;
    }

    Events.record(currentUser, "delete", "widget", $scope.widget.id);

    $scope.widget.$delete(function() {
      $scope.dashboard.widgets = _.map($scope.dashboard.widgets, function(row) {
        return _.filter(row, function(widget) {
          return widget.id != undefined;
        })
      });
    });
  };

  Events.record(currentUser, "view", "widget", $scope.widget.id);

  if ($scope.widget.visualization) {
    Events.record(currentUser, "view", "query", $scope.widget.visualization.query.id);
    Events.record(currentUser, "view", "visualization", $scope.widget.visualization.id);

    $scope.query = $scope.widget.getQuery();
    var parameters = Query.collectParamsFromQueryString($location, $scope.query);
    var maxAge = $location.search()['maxAge'];
    $scope.queryResult = $scope.query.getQueryResult(maxAge, parameters);
    $scope.type = 'visualization';

    $scope.missingParameters = false;
    var requiredParameters = $scope.query.getParameters();
    // Searchs if all the parameters are instantiated
    for (var i = 0; i < requiredParameters.length; i++) {
      if (parameters[requiredParameters[i]] === undefined) {
        $scope.missingParameters = true;
      }
    }
  } else {
    $scope.type = 'textbox';
  }

  // Listen for url changed
  $scope.$on('$routeUpdate', function() {
    if ($scope.widget.visualization) {
      // Set missingParameters to false
      $scope.missingParameters = false;
      // Gets query
      $scope.query = $scope.widget.getQuery();
      // Gets the parameters from the query and location
      var parameters = Query.collectParamsFromQueryString($location, $scope.query);
      var maxAge = $location.search()['maxAge'];
      // Calls to query
      $scope.queryResult = $scope.query.getQueryResult(maxAge, parameters);
      var requiredParameters = $scope.query.getParameters();
      // Searchs if all the parameters are instantiated
      for (var i = 0; i < requiredParameters.length; i++) {
        if (parameters[requiredParameters[i]] === undefined) {
          $scope.missingParameters = true;
          return;
        }
      }
    }
  });
};

angular.module('redash.controllers')
  .controller('DashboardCtrl', ['$scope', 'Events', 'Widget', 'FavoriteDashboards', 'FileSaver', '$routeParams', '$location', '$http', '$timeout', '$q', 'Dashboard', 'Parameters', DashboardCtrl])
  .controller('WidgetCtrl', ['$scope', '$location', 'Events', 'Query', 'Parameters', WidgetCtrl])

})();