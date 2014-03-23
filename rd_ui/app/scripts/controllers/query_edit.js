(function() {
  'use strict';

  function QueryEditCtrl($controller, $scope, $route, $location, growl, Query, Visualization) {
    var isNewQuery = !$route.current.locals.query.id;

    // controller inheritance
    $controller('QueryViewCtrl', {$scope: $scope});

    $scope.sourceMode = true;
    $scope.isDirty = false;
    $scope.canEdit = currentUser.canEdit($scope.query);

    $scope.newVisualization = undefined;

    $scope.deleteVisualization = function($e, vis) {
      $e.preventDefault();
      if (confirm('Are you sure you want to delete ' + vis.name + ' ?')) {
        Visualization.delete(vis);
        if ($scope.selectedTab == vis.id) {
          $scope.selectedTab = DEFAULT_TAB;
          $location.hash($scope.selectedTab);
        }
        $scope.query.visualizations =
          $scope.query.visualizations.filter(function(v) {
            return vis.id !== v.id;
          });
      }
    };

    $scope.$watch('query.query', function(current, prev) {
      $scope.isDirty = (current !== prev);
    });

    if (isNewQuery) {
      // save new query when creating a visualization
      var unbind = $scope.$watch('selectedTab == "add"', function(newPanel) {
        if (newPanel && $route.current.params.queryId == undefined) {
          unbind();
          $scope.saveQuery();
        }
      });
    }

  };

  angular.module('redash.controllers').controller('QueryEditCtrl', [
    '$controller', '$scope', '$route', '$location', 'growl', 'Query',
    'Visualization', QueryEditCtrl
    ]);
})();