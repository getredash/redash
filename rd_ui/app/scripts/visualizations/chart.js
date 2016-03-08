(function () {
  var chartVisualization = angular.module('redash.visualization');

  chartVisualization.config(['VisualizationProvider', function (VisualizationProvider) {
    var renderTemplate = '<chart-renderer options="visualization.options" query-result="queryResult"></chart-renderer>';
    var editTemplate = '<chart-editor options="visualization.options" query-result="queryResult"></chart-editor>';

    var defaultOptions = {
      globalSeriesType: 'column',
      sortX: true,
      legend: {enabled: true},
      yAxis: [{type: 'linear'}, {type: 'linear', opposite: true}],
      xAxis: {type: 'datetime', labels: {enabled: true}},
      series: {stacking: null},
      seriesOptions: {},
      columnMapping: {}
    };

    VisualizationProvider.registerVisualization({
      type: 'CHART',
      name: 'Chart',
      renderTemplate: renderTemplate,
      editorTemplate: editTemplate,
      defaultOptions: defaultOptions
    });
  }]);

  chartVisualization.directive('chartRenderer', function () {
    return {
      restrict: 'E',
      scope: {
        queryResult: '=',
        options: '=?'
      },
      templateUrl: '/views/visualizations/chart.html',
      replace: false,
      controller: ['$scope', function ($scope) {
        $scope.chartSeries = [];

        var reloadChart = function() {
          reloadData();
          $scope.plotlyOptions = $scope.options;
        };

        var reloadData = function() {
          if (angular.isDefined($scope.queryResult)) {
            $scope.chartSeries = _.sortBy($scope.queryResult.getChartData($scope.options.columnMapping),
                                          function(series) {
                                            if ($scope.options.seriesOptions[series.name]) {
                                              return $scope.options.seriesOptions[series.name].zIndex;
                                            }
                                            return 0;
                                          });
          }
        };

        $scope.$watch('options', reloadChart, true);
        $scope.$watch('queryResult && queryResult.getData()', reloadData);
      }]
    };
  });

  chartVisualization.directive('chartEditor', function (ColorPalette) {
    return {
      restrict: 'E',
      templateUrl: '/views/visualizations/chart_editor.html',
      scope: {
        queryResult: '=',
        options: '=?'
      },
      link: function (scope, element, attrs) {
        scope.colors = _.extend({'Automatic': null}, ColorPalette);

        scope.stackingOptions = {
          'Disabled': null,
          'Enabled': 'normal',
          'Percent': 'percent'
        };

        scope.chartTypes = {
          'line': {name: 'Line', icon: 'line-chart'},
          'column': {name: 'Bar', icon: 'bar-chart'},
          'area': {name: 'Area', icon: 'area-chart'},
          'pie': {name: 'Pie', icon: 'pie-chart'},
          'scatter': {name: 'Scatter', icon: 'circle-o'}
        };

        scope.chartTypeChanged = function() {
          _.each(scope.options.seriesOptions, function(options) {
            options.type = scope.options.globalSeriesType;
          });
        };

        scope.xAxisScales = ['datetime', 'linear', 'logarithmic', 'category'];
        scope.yAxisScales = ['linear', 'logarithmic'];

        var refreshColumns = function() {
          scope.columns = scope.queryResult.getColumns();
          scope.columnNames = _.pluck(scope.columns, 'name');
          if (scope.columnNames.length > 0)
            _.each(_.difference(_.keys(scope.options.columnMapping), scope.columnNames), function(column) {
              delete scope.options.columnMapping[column];
            });
        };
        refreshColumns();

        var refreshColumnsAndForm = function() {
          refreshColumns();
          if (!scope.queryResult.getData() || scope.queryResult.getData().length == 0 || scope.columns.length == 0)
            return;
          scope.form.yAxisColumns = _.intersection(scope.form.yAxisColumns, scope.columnNames);
          if (!_.contains(scope.columnNames, scope.form.xAxisColumn))
            scope.form.xAxisColumn = undefined;
          if (!_.contains(scope.columnNames, scope.form.groupby))
            scope.form.groupby = undefined;
        }

        var refreshSeries = function() {
          var seriesNames = _.pluck(scope.queryResult.getChartData(scope.options.columnMapping), 'name');
          var existing = _.keys(scope.options.seriesOptions);
          _.each(_.difference(seriesNames, existing), function(name) {
            scope.options.seriesOptions[name] = {
              'type': scope.options.globalSeriesType,
              'yAxis': 0,
            };
            scope.form.seriesList.push(name);
          });
          _.each(_.difference(existing, seriesNames), function(name) {
            scope.form.seriesList = _.without(scope.form.seriesList, name)
            delete scope.options.seriesOptions[name];
          });
        };

        scope.$watch('options.columnMapping', function() {
          if (scope.queryResult.status === "done") {
            refreshSeries();
          }
        }, true);

        scope.$watch(function() {return [scope.queryResult.getId(), scope.queryResult.status];}, function(changed) {
          if (!changed[0] || changed[1] !== "done") {
            return;
          }

          refreshColumnsAndForm();
          refreshSeries();
        }, true);

        scope.form = {
          yAxisColumns: [],
          seriesList: _.sortBy(_.keys(scope.options.seriesOptions), function(name) {
            return scope.options.seriesOptions[name].zIndex;
          })
        };

        scope.$watchCollection('form.seriesList', function(value, old) {
          _.each(value, function(name, index) {
            scope.options.seriesOptions[name].zIndex = index;
            scope.options.seriesOptions[name].index = 0; // is this needed?
          });
        });

        var setColumnRole = function(role, column) {
          scope.options.columnMapping[column] = role;
        }
        var unsetColumn = function(column) {
          setColumnRole('unused', column);
        }

        scope.$watchCollection('form.yAxisColumns', function(value, old) {
          _.each(old, unsetColumn);
          _.each(value, _.partial(setColumnRole, 'y'));
        });

        scope.$watch('form.xAxisColumn', function(value, old) {
          if (old !== undefined)
            unsetColumn(old);
          if (value !== undefined)
            setColumnRole('x', value);
        });

        scope.$watch('form.groupby', function(value, old) {
          if (old !== undefined)
            unsetColumn(old)
          if (value !== undefined) {
            setColumnRole('series', value);
          }
        });

        if (!_.has(scope.options, 'legend')) {
          scope.options.legend = {enabled: true};
        }

        if (scope.columnNames)
          _.each(scope.options.columnMapping, function(value, key) {
            if (scope.columnNames.length > 0 && !_.contains(scope.columnNames, key))
              return;
            if (value == 'x')
              scope.form.xAxisColumn = key;
            else if (value == 'y')
              scope.form.yAxisColumns.push(key);
            else if (value == 'series')
              scope.form.groupby = key;
          });
      }
    }
  });
}());
