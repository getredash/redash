(function() {
  'use strict';

  function QuerySourceCtrl($controller, $scope, $location, Query, Visualization, KeyboardShortcuts) {
    // extends QueryViewCtrl
    $controller('QueryViewCtrl', {$scope: $scope});
    // TODO:
    // This doesn't get inherited. Setting it on this didn't work either (which is weird).
    // Obviously it shouldn't be repeated, but we got bigger fish to fry.
    var DEFAULT_TAB = 'table';

    var isNewQuery = !$scope.query.id,
        queryText = $scope.query.query,
        // ref to QueryViewCtrl.saveQuery
        saveQuery = $scope.saveQuery,
        shortcuts = {
          'meta+s': function () {
            if ($scope.canEdit) {
              $scope.saveQuery();
            }
          }
        };

    $scope.sourceMode = true;
    $scope.canEdit = currentUser.canEdit($scope.query);
    $scope.isDirty = false;

    $scope.newVisualization = undefined;

    KeyboardShortcuts.bind(shortcuts);

    // @override
    $scope.saveQuery = function(options, data) {
      var savePromise = saveQuery(options, data);

      savePromise.then(function(savedQuery) {
        queryText = savedQuery.query;
        $scope.isDirty = $scope.query.query !== queryText;

        if (isNewQuery) {
          // redirect to new created query (keep hash)
          $location.path(savedQuery.getSourceLink()).replace();
        }
      });

      return savePromise;
    };

    $scope.duplicateQuery = function() {
      $scope.query.id = null;
      $scope.query.ttl = -1;

      $scope.saveQuery({
        successMessage: 'Query forked',
        errorMessage: 'Query could not be forked'
      }).then(function redirect(savedQuery) {
        // redirect to forked query (clear hash)
        $location.url(savedQuery.getSourceLink()).replace()
      });
    };

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
      $scope.isDirty = (newQueryText !== queryText);
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
  }

  angular.module('redash.controllers').controller('QuerySourceCtrl', [
    '$controller', '$scope', '$location', 'Query',
    'Visualization', 'KeyboardShortcuts', QuerySourceCtrl
    ]);
})();