(function() {
  'use strict'

  var directives = angular.module('redash.directives');

  directives.directive('editDashboardForm', ['Events', '$http', '$location', '$timeout', 'Dashboard', 'growl',
    function(Events, $http, $location, $timeout, Dashboard, growl) {
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

          $scope.$watch('dashboard.layout', function() {
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
                      name: widget.getName()//visualization.query.name
                    });
                  });
                });

                _.each(layout, function(item) {
                  var el = gsItemTemplate.replace('{id}', item.id).replace('{name}', item.name);
                  gridster.add_widget(el, item.xSize, item.ySize, item.col, item.row);
                });
              }
            });
          }, true);

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
              Dashboard.save({slug: $scope.dashboard.id, name: $scope.dashboard.name,
                  version: $scope.dashboard.version, layout: layout}, function(dashboard) {
                $scope.dashboard = dashboard;
                $scope.saveInProgress = false;
                $(element).modal('hide');
              }, function(error) {
                $scope.saveInProgress = false;
                if(error.status == 403) {
                  growl.addErrorMessage("Unable to save dashboard: Permission denied.");
                } else if(error.status == 409) {
                  growl.addErrorMessage('It seems like the dashboard has been modified by another user. ' +
                      'Please copy/backup your changes and reload this page.', {ttl: -1});
                }
              });
              Events.record(currentUser, 'edit', 'dashboard', $scope.dashboard.id);
            } else {

              $http.post('api/dashboards', {
                'name': $scope.dashboard.name
              }).success(function(response) {
                $(element).modal('hide');
                $scope.dashboard = {
                  'name': null,
                  'layout': null
                };
                $scope.saveInProgress = false;
                $location.path('/dashboard/' + response.slug).replace();
              });
              Events.record(currentUser, 'create', 'dashboard');
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

          $scope.type = 'visualization';

          $scope.isVisualization = function () {
            return $scope.type == 'visualization';
          };

          $scope.isTextBox = function () {
            return $scope.type == 'textbox';
          };

          $scope.setType = function (type) {
            $scope.type = type;
            if (type == 'textbox') {
              $scope.widgetSizes.push({name: 'Hidden', value: 0});
            } else if ($scope.widgetSizes.length > 2) {
              $scope.widgetSizes.pop();
            }
          };

          var reset = function() {
            $scope.saveInProgress = false;
            $scope.widgetSize = 1;
            $scope.selectedVis = null;
            $scope.query = {};
            $scope.selected_query = undefined;
            $scope.text = "";
          };

          reset();

          $scope.loadVisualizations = function () {
            if (!$scope.query.selected) {
              return;
            }

            Query.get({ id: $scope.query.selected.id }, function(query) {
              if (query) {
                $scope.selected_query = query;
                if (query.visualizations.length) {
                  $scope.selectedVis = query.visualizations[0];
                }
              }
            });
          };

          $scope.searchQueries = function (term) {
            if (!term || term.length < 3) {
              return;
            }

            Query.search({q: term}, function(results) {
              $scope.queries = results;
            });
          };

          $scope.$watch('query', function () {
            $scope.loadVisualizations();
          }, true);

          $scope.saveWidget = function() {
            $scope.saveInProgress = true;
            var widget = new Widget({
              'visualization_id': $scope.selectedVis && $scope.selectedVis.id,
              'dashboard_id': $scope.dashboard.id,
              'options': {},
              'width': $scope.widgetSize,
              'text': $scope.text
            });

            widget.$save().then(function(response) {
              // update dashboard layout
              $scope.dashboard.layout = response['layout'];
              var newWidget = new Widget(response['widget']);
              if (response['new_row']) {
                $scope.dashboard.widgets.push([newWidget]);
              } else {
                $scope.dashboard.widgets[$scope.dashboard.widgets.length - 1].push(newWidget);
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
