(function() {
  'use strict';

  function QueryEditCtrl($controller, $scope, $location, growl, Query, Visualization, KeyboardShortcuts) {
    // extends QueryViewCtrl
    $controller('QueryViewCtrl', {$scope: $scope});

    var
    _queryText = $scope.query.query,
    isNewQuery = !$scope.query.id,
    shortcuts = {
      'meta+s': $scope.saveQuery
    };

    $scope.sourceMode = true;
    $scope.isDirty = false;
    $scope.canEdit = currentUser.canEdit($scope.query);

    $scope.newVisualization = undefined;

    KeyboardShortcuts.bind(shortcuts);

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

    $scope.$watch('query.query', function(newQueryText) {
      $scope.isDirty = (newQueryText !== _queryText);
    });

    $scope.$on('$destroy', function destroy() {
      KeyboardShortcuts.unbind(shortcuts);
    });

    if (isNewQuery) {
      // save new query when creating a visualization
      var unbind = $scope.$watch('selectedTab == "add"', function(triggerSave) {
        if (triggerSave) {
          unbind();
          $scope.saveQuery();
        }
      });
    }

  };

  angular.module('redash.controllers').controller('QueryEditCtrl', [
    '$controller', '$scope', '$location', 'growl', 'Query',
    'Visualization', 'KeyboardShortcuts', QueryEditCtrl
    ]);
})();