(function() {
  'use strict';

  function QueryViewCtrl($scope, $route, $location, notifications, growl, Query, DataSource) {
    var DEFAULT_TAB = 'table';

    $scope.query = $route.current.locals.query;
    $scope.queryResult = $scope.query.getQueryResult();
    $scope.queryExecuting = false;

    $scope.isQueryOwner = currentUser.id === $scope.query.user.id;
    $scope.canViewSource = currentUser.hasPermission('view_source');

    $scope.dataSources = DataSource.get(function(dataSources) {
      $scope.query.data_source_id = $scope.query.data_source_id || dataSources[0].id;
    });

    $scope.onQuerySave = angular.noop;

    $scope.lockButton = function(lock) {
      $scope.queryExecuting = lock;
    };

    $scope.saveQuery = function(duplicate) {
      var
      successMessage = "Query saved",
      oldId = $scope.query.id;

      if (duplicate) {
        successMessage = "Query forked";
        $scope.query.id = null;
        $scope.query.ttl = -1;
      }

      delete $scope.query.latest_query_data;

      $scope.query.$save(function(savedQuery) {
        $scope.onQuerySave(savedQuery);

        if (oldId != savedQuery.id) {
          // redirect to new/duplicated query page
          $location.url('/queries/' + savedQuery.id + '/source#' + $location.hash()).replace();
        }

        growl.addSuccessMessage(successMessage);
      }, function(httpResponse) {
        growl.addErrorMessage("Query could not be saved");
      });
    };

    $scope.duplicateQuery = function() {
      $scope.saveQuery(true);
    };

    $scope.executeQuery = function() {
      $scope.queryResult = $scope.query.getQueryResult(0);
      $scope.lockButton(true);
      $scope.cancelling = false;
    };

    $scope.cancelExecution = function() {
      $scope.cancelling = true;
      $scope.queryResult.cancelExecution();
    };

    $scope.updateDataSource = function() {
        $scope.query.latest_query_data = null;
        $scope.query.latest_query_data_id = null;
        Query.save({
            'id': $scope.query.id,
            'data_source_id': $scope.query.data_source_id,
            'latest_query_data_id': null
        });

        $scope.executeQuery();
    };

    $scope.$watch('query.name', function() {
      $scope.$parent.pageTitle = $scope.query.name;
    });

    $scope.$watch('queryResult && queryResult.getError()',
      function(newError, oldError) {
        if (newError == undefined) {
          return;
        }

        if (oldError == undefined && newError != undefined) {
          $scope.lockButton(false);
        }
      });

    $scope.$watch('queryResult && queryResult.getData()',
      function(data, oldData) {
        if (!data) {
          return;
        }

        $scope.filters = $scope.queryResult.getFilters();

        if ($scope.queryResult.getId() == null) {
          $scope.dataUri = "";
        } else {
          $scope.dataUri =
            '/api/queries/' + $scope.query.id + '/results/' +
            $scope.queryResult.getId() + '.csv';

          $scope.dataFilename =
            $scope.query.name.replace(" ", "_") +
            moment($scope.queryResult.getUpdatedAt()).format("_YYYY_MM_DD") +
            ".csv";
        }
      });

    $scope.$watch("queryResult && queryResult.getStatus()", function(status) {
      if (!status) {
        return;
      }

      if (status == "done") {
        if ($scope.query.id &&
          $scope.query.latest_query_data_id != $scope.queryResult.getId() &&
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

    $scope.$watch(function() {
      return $location.hash()
    }, function(hash) {
      $scope.selectedTab = hash || DEFAULT_TAB;
    });
  };

  angular.module('redash.controllers')
    .controller('QueryViewCtrl',
      ['$scope', '$route', '$location', 'notifications', 'growl', 'Query', 'DataSource', QueryViewCtrl]);
})();