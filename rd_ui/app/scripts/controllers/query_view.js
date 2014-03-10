(function() {
  'use strict';

  var QueryViewCtrl = function($scope, $window, $route, $http, $location, growl, notifications, Query, Visualization) {
    var DEFAULT_TAB = 'table';
    var pristineHash = null;
    var leavingPageText = "You will lose your changes if you leave";
    var route = $route.current;

    $scope.dirty = undefined;
    $scope.isOwner = false;
    $scope.canEdit = false;

    $scope.isSourceVisible = route.locals.viewSource;

    $scope.sourceHref = $scope.isSourceVisible ?
      $location.url().replace('src', '') : $location.path() + '/src#' + $location.hash();

    $scope.queryExecuting = false;

    $scope.newVisualization = undefined;

    $window.onbeforeunload = function() {
      if ($scope.canEdit && $scope.dirty) {
        return leavingPageText;
      }
    }

    Mousetrap.bindGlobal("meta+s", function(e) {
      e.preventDefault();

      if ($scope.canEdit) {
        $scope.saveQuery();
      }
    });

    $scope.$on('$locationChangeStart', function(event, next, current) {
      if (next.split("#")[0] == current.split("#")[0]) {
        return;
      }

      if (!$scope.canEdit) {
        return;
      }

      if ($scope.dirty && !confirm(leavingPageText + "\n\nAre you sure you want to leave this page?")) {
        event.preventDefault();
      } else {
        Mousetrap.unbind("meta+s");
      }
    });

    $scope.$parent.pageTitle = "Query Fiddle";

    $scope.$watch(function() {
      return $location.hash()
    }, function(hash) {
      $scope.selectedTab = hash || DEFAULT_TAB;
    });

    $scope.lockButton = function(lock) {
      $scope.queryExecuting = lock;
    };

    $scope.formatQuery = function() {
      $scope.editorOptions.readOnly = 'nocursor';

      $http.post('/api/queries/format', {
        'query': $scope.query.query
      }).success(function(response) {
        $scope.query.query = response;
        $scope.editorOptions.readOnly = false;
      })
    }

    $scope.saveQuery = function(duplicate, oldId) {
      if (!oldId) {
        oldId = $scope.query.id;
      }

      delete $scope.query.latest_query_data;
      $scope.query.$save(function(q) {
        pristineHash = q.getHash();
        $scope.dirty = false;

        if (duplicate) {
          growl.addInfoMessage("Query duplicated.", {
            ttl: 2000
          });
        } else {
          growl.addSuccessMessage("Query saved.", {
            ttl: 2000
          });
        }

        if (oldId != q.id) {
          if (oldId == undefined) {
            $location.path($location.path().replace('new', q.id)).replace();
          } else {
            // TODO: replace this with a safer method
            $location.path($location.path().replace(oldId, q.id)).replace();

            // Reset visualizations tab to table after duplicating a query:
            $location.hash(DEFAULT_TAB);
          }
        }
      }, function(httpResponse) {
        growl.addErrorMessage("Query could not be saved");
      });
    };

    $scope.duplicateQuery = function() {
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

    $scope.refreshOptions = [{
      value: -1,
      name: 'No Refresh'
    }, {
      value: 60,
      name: 'Every minute'
    }, ]

    _.each(_.range(1, 13), function(i) {
      $scope.refreshOptions.push({
        value: i * 3600,
        name: 'Every ' + i + 'h'
      });
    })

    $scope.refreshOptions.push({
      value: 24 * 3600,
      name: 'Every 24h'
    });
    $scope.refreshOptions.push({
      value: 7 * 24 * 3600,
      name: 'Once a week'
    });

    $scope.$watch('queryResult && queryResult.getError()', function(newError, oldError) {
      if (newError == undefined) {
        return;
      }

      if (oldError == undefined && newError != undefined) {
        $scope.lockButton(false);
      }
    });

    $scope.$watch('queryResult && queryResult.getData()', function(data, oldData) {
      if (!data) {
        return;
      }

      if ($scope.queryResult.getId() == null) {
        $scope.dataUri = "";
      } else {
        $scope.dataUri = '/api/queries/' + $scope.query.id + '/results/' + $scope.queryResult.getId() + '.csv';
        $scope.dataFilename = $scope.query.name.replace(" ", "_") + moment($scope.queryResult.getUpdatedAt()).format("_YYYY_MM_DD") + ".csv";
      }
    });

    $scope.$watch("queryResult && queryResult.getStatus()", function(status) {
      if (!status) {
        return;
      }

      if (status == "done") {
        if ($scope.query.id && $scope.query.latest_query_data_id != $scope.queryResult.getId() &&
          $scope.query.query_hash == $scope.queryResult.query_result.query_hash) {
          Query.save({
            'id': $scope.query.id,
            'latest_query_data_id': $scope.queryResult.getId()
          })
        }
        $scope.query.latest_query_data_id = $scope.queryResult.getId();

        notifications.showNotification("re:dash", $scope.query.name + " updated.");

        $scope.lockButton(false);
      }
    });

    // view or source pages: controller is instantiated with a query
    if (route.locals.query) {
      $scope.query = route.locals.query;
      pristineHash = $scope.query.getHash();
      $scope.dirty = false;
      $scope.queryResult = $scope.query.getQueryResult();

      $scope.isOwner = currentUser.canEdit($scope.query);
      $scope.canEdit = $scope.isSourceVisible && $scope.isOwner;

    } else {
      // new query
      $scope.query = new Query({
        query: "",
        name: "New Query",
        ttl: -1,
        user: currentUser
      });
      $scope.lockButton(false);
    }

    $scope.$watch('query.name', function() {
      $scope.$parent.pageTitle = $scope.query.name;
    });

    $scope.$watch(function() {
      return $scope.query.getHash();
    }, function(newHash) {
      $scope.dirty = (newHash !== pristineHash);
    });

    $scope.executeQuery = function() {
      $scope.queryResult = $scope.query.getQueryResult(0);
      $scope.lockButton(true);
      $scope.cancelling = false;
    };

    $scope.cancelExecution = function() {
      $scope.cancelling = true;
      $scope.queryResult.cancelExecution();
    };

    $scope.deleteVisualization = function($e, vis) {
      $e.preventDefault();
      if (confirm('Are you sure you want to delete ' + vis.name + ' ?')) {
        Visualization.delete(vis);
        if ($scope.selectedTab == vis.id) {
          $scope.selectedTab = DEFAULT_TAB;
        }
        $scope.query.visualizations =
          $scope.query.visualizations.filter(function(v) {
            return vis.id !== v.id;
          });
      }
    };

    var unbind = $scope.$watch('selectedTab == "add"', function(newPanel) {
      if (newPanel && route.params.queryId == undefined) {
        unbind();
        $scope.saveQuery();
      }
    });
  };

  angular.module('redash.controllers').controller('QueryViewCtrl',
    [
      '$scope',
      '$window',
      '$route',
      '$http',
      '$location',
      'growl',
      'notifications',
      'Query',
      'Visualization',
      QueryViewCtrl
    ]);

})();