(function() {
  'use strict'

  var directives = angular.module('redash.directives');

  directives.directive('editDashboardForm', ['$http', '$location', '$timeout', 'Dashboard',
    function($http, $location, $timeout, Dashboard) {
      return {
        restrict: 'E',
        scope: {
          dashboard: '='
        },
        templateUrl: '/views/edit_dashboard.html',
        replace: true,
        link: function($scope, element, attrs) {
          var gridster = element.find(".gridster ul").gridster({
            widget_margins: [5, 5],
            widget_base_dimensions: [260, 100],
            min_cols: 2,
            max_cols: 2,
            serialize_params: function($w, wgd) {
              return {
                col: wgd.col,
                row: wgd.row,
                id: $w.data('widget-id')
              }
            }
          }).data('gridster');

          var gsItemTemplate = '<li data-widget-id="{id}" class="widget panel panel-default gs-w">' +
            '<div class="panel-heading">{name}' +
            '</div></li>';

          $scope.$watch('dashboard.widgets && dashboard.widgets.length', function(widgets_length) {
            $timeout(function() {
              gridster.remove_all_widgets();

              if ($scope.dashboard.widgets && $scope.dashboard.widgets.length) {
                var layout = [];

                _.each($scope.dashboard.widgets, function(row, rowIndex) {
                  _.each(row, function(widget, colIndex) {
                    layout.push({
                      id: widget.id,
                      col: colIndex + 1,
                      row: rowIndex + 1,
                      ySize: 1,
                      xSize: widget.width,
                      name: widget.visualization.query.name
                    });
                  });
                });

                _.each(layout, function(item) {
                  var el = gsItemTemplate.replace('{id}', item.id).replace('{name}', item.name);
                  gridster.add_widget(el, item.xSize, item.ySize, item.col, item.row);

                });
              }
            });
          });

          $scope.saveDashboard = function() {
            $scope.saveInProgress = true;
            // TODO: we should use the dashboard service here.
            if ($scope.dashboard.id) {
              var positions = $(element).find('.gridster ul').data('gridster').serialize();
              var layout = [];
              _.each(_.sortBy(positions, function(pos) {
                return pos.row * 10 + pos.col;
              }), function(pos) {
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
              $http.post('/api/dashboards/' + $scope.dashboard.id, {
                'name': $scope.dashboard.name,
                'layout': layout
              }).success(function(response) {
                $scope.dashboard = new Dashboard(response);
                $scope.saveInProgress = false;
                $(element).modal('hide');
              })
            } else {
              $http.post('/api/dashboards', {
                'name': $scope.dashboard.name
              }).success(function(response) {
                $(element).modal('hide');
                $location.path('/dashboard/' + response.slug).replace();
              })
            }
          }

        }
      }
    }
  ]);

  directives.directive('newWidgetForm', ['Query', 'Widget', 'growl',
    function(Query, Widget, growl) {
      return {
        restrict: 'E',
        scope: {
          dashboard: '='
        },
        templateUrl: '/views/new_widget_form.html',
        replace: true,
        link: function($scope, element, attrs) {
          $scope.widgetSizes = [{
            name: 'Regular',
            value: 1
          }, {
            name: 'Double',
            value: 2
          }];

          var reset = function() {
            $scope.saveInProgress = false;
            $scope.widgetSize = 1;
            $scope.queryId = null;
            $scope.selectedVis = null;
            $scope.query = null;

          }

          reset();

          $scope.loadVisualizations = function() {
            if (!$scope.queryId) {
              return;
            }

            Query.get({
              id: $scope.queryId
            }, function(query) {
              if (query) {
                $scope.query = query;
                if (query.visualizations.length) {
                  $scope.selectedVis = query.visualizations[0];
                }
              }
            });
          };

          $scope.saveWidget = function() {
            $scope.saveInProgress = true;

            var widget = new Widget({
              'visualization_id': $scope.selectedVis.id,
              'dashboard_id': $scope.dashboard.id,
              'options': {},
              'width': $scope.widgetSize
            });

            widget.$save().then(function(response) {
              // update dashboard layout
              $scope.dashboard.layout = response['layout'];
              if (response['new_row']) {
                $scope.dashboard.widgets.push([response['widget']]);
              } else {
                $scope.dashboard.widgets[$scope.dashboard.widgets.length - 1].push(response['widget']);
              }

              // close the dialog
              $('#add_query_dialog').modal('hide');
              reset();
            }).catch(function() {
              growl.addErrorMessage("Widget can not be added");
            }).finally(function() {
              $scope.saveInProgress = false;
            });
          }

        }
      }
    }
  ])
})();