(function() {
  'use strict';

  function QueryEditCtrl($controller, $scope, $window, $route, $location, growl, Query, Visualization) {
    var pristineHash = "";
    var leavingPageText = "You will lose your changes if you leave";
    var isNewQuery = !$route.current.locals.query.id;

    // controller inheritance
    $controller('QueryViewCtrl', {$scope: $scope});

    $scope.sourceMode = true;
    $scope.isDirty = undefined;

    $scope.canEdit = currentUser.canEdit($scope.query);

    $scope.newVisualization = undefined;

    $window.onbeforeunload = function() {
      if ($scope.canEdit && $scope.isDirty) {
        return leavingPageText;
      }
    }

    $scope.$on('$locationChangeStart', function(event, next, current) {
      if (next.split("#")[0] == current.split("#")[0]) {
        return;
      }

      if (!$scope.canEdit) {
        return;
      }

      if ($scope.isDirty && !confirm(leavingPageText + "\n\nAre you sure you want to leave this page?")) {
        event.preventDefault();
      } else {
        Mousetrap.unbind("meta+s");
      }
    });

    $scope.saveQuery = function(duplicate, oldId) {
      if (!oldId) {
        oldId = $scope.query.id;
      }

      delete $scope.query.latest_query_data;
      $scope.query.$save(function(q) {
        pristineHash = q.getHash();
        $scope.isDirty = false;

        if (duplicate) {
          growl.addSuccessMessage("Query forked");
        } else {
          growl.addSuccessMessage("Query saved");
        }

        if (oldId != q.id) {
          $location.url($location.url().replace(oldId, q.id)).replace();
        }
      }, function(httpResponse) {
        growl.addErrorMessage("Query could not be saved");
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


    $scope.$watch(function() {
      return $scope.query.getHash();
    }, function(newHash) {
      $scope.isDirty = (newHash !== pristineHash);
    });

    if (isNewQuery) {
      // $scope.lockButton(false);

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
    '$controller', '$scope', '$window', '$route', '$location', 'growl', 'Query',
    'Visualization', QueryEditCtrl
    ]);
})();