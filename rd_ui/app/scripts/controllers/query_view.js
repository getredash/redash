(function() {
  'use strict';

  function QueryViewCtrl($scope, Events, $route, $location, notifications, growl, $modal, Query, DataSource) {
    var DEFAULT_TAB = 'table';

    var getQueryResult = function(maxAge) {
      // Collect params, and getQueryResult with params; getQueryResult merges it into the query
      var parameters = Query.collectParamsFromQueryString($location, $scope.query);
      if (maxAge == undefined) {
        maxAge = $location.search()['maxAge'];
      }

      if (maxAge == undefined) {
        maxAge = -1;
      }

      $scope.showLog = false;
      $scope.queryResult = $scope.query.getQueryResult(maxAge, parameters);
    }

    $scope.dataSource = {};
    $scope.query = $route.current.locals.query;

    var updateSchema = function() {
      $scope.hasSchema = false;
      $scope.editorSize = "col-md-12";
      var dataSourceId = $scope.query.data_source_id || $scope.dataSources[0].id;
      DataSource.getSchema({id: dataSourceId}, function(data) {
        if (data && data.length > 0) {
          $scope.schema = data;
          _.each(data, function(table) {
            table.collapsed = true;
          });

          $scope.editorSize = "col-md-9";
          $scope.hasSchema = true;
        } else {
          $scope.hasSchema = false;
          $scope.editorSize = "col-md-12";
        }
      });
    }

    Events.record(currentUser, 'view', 'query', $scope.query.id);
    getQueryResult();
    $scope.queryExecuting = false;

    $scope.isQueryOwner = (currentUser.id === $scope.query.user.id) || currentUser.hasPermission('admin');
    $scope.canViewSource = currentUser.hasPermission('view_source');

    $scope.dataSources = DataSource.query(function(dataSources) {
      updateSchema();

      if ($scope.query.isNew()) {
        $scope.query.data_source_id = $scope.query.data_source_id || dataSources[0].id;
        $scope.dataSource = _.find(dataSources, function(ds) { return ds.id == $scope.query.data_source_id; });
      }
    });

    // in view mode, latest dataset is always visible
    // source mode changes this behavior
    $scope.showDataset = true;
    $scope.showLog = false;

    $scope.lockButton = function(lock) {
      $scope.queryExecuting = lock;
    };

    $scope.showApiKey = function() {
      alert("API Key for this query:\n" + $scope.query.api_key);
    };

    $scope.saveQuery = function(options, data) {
      if (data) {
        data.id = $scope.query.id;
      } else {
        data = _.clone($scope.query);
      }

      options = _.extend({}, {
        successMessage: 'Query saved',
        errorMessage: 'Query could not be saved'
      }, options);

      delete data.latest_query_data;
      delete data.queryResult;

      return Query.save(data, function() {
        growl.addSuccessMessage(options.successMessage);
      }, function(httpResponse) {
        growl.addErrorMessage(options.errorMessage);
      }).$promise;
    }

    $scope.saveDescription = function() {
      Events.record(currentUser, 'edit_description', 'query', $scope.query.id);
      $scope.saveQuery(undefined, {'description': $scope.query.description});
    };

    $scope.saveName = function() {
      Events.record(currentUser, 'edit_name', 'query', $scope.query.id);
      $scope.saveQuery(undefined, {'name': $scope.query.name});
    };

    $scope.executeQuery = function() {
      if (!$scope.query.query) {
        return;
      }
      getQueryResult(0);
      $scope.lockButton(true);
      $scope.cancelling = false;
      Events.record(currentUser, 'execute', 'query', $scope.query.id);
    };

    $scope.cancelExecution = function() {
      $scope.cancelling = true;
      $scope.queryResult.cancelExecution();
      Events.record(currentUser, 'cancel_execute', 'query', $scope.query.id);
    };

    $scope.archiveQuery = function(options, data) {
      if (data) {
        data.id = $scope.query.id;
      } else {
        data = $scope.query;
      }

      $scope.isDirty = false;

      options = _.extend({}, {
        successMessage: 'Query archived',
        errorMessage: 'Query could not be archived'
      }, options);

      return Query.delete({id: data.id}, function() {
        $scope.query.is_archived = true;
        $scope.query.schedule = null;
        growl.addSuccessMessage(options.successMessage);
          // This feels dirty.
          $('#archive-confirmation-modal').modal('hide');
        }, function(httpResponse) {
          growl.addErrorMessage(options.errorMessage);
        }).$promise;
    }

    $scope.updateDataSource = function() {
      Events.record(currentUser, 'update_data_source', 'query', $scope.query.id);

      $scope.query.latest_query_data = null;
      $scope.query.latest_query_data_id = null;

      if ($scope.query.id) {
        Query.save({
          'id': $scope.query.id,
          'data_source_id': $scope.query.data_source_id,
          'latest_query_data_id': null
        });
      }

      updateSchema();
      $scope.dataSource = _.find($scope.dataSources, function(ds) { return ds.id == $scope.query.data_source_id; });
      $scope.executeQuery();
    };

    $scope.setVisualizationTab = function (visualization) {
      $scope.selectedTab = visualization.id;
      $location.hash(visualization.id);
    };

    $scope.$watch('query.name', function() {
      $scope.$parent.pageTitle = $scope.query.name;
    });

    $scope.$watch('queryResult && queryResult.getData()', function(data, oldData) {
      if (!data) {
        return;
      }

      $scope.filters = $scope.queryResult.getFilters();
    });

    $scope.$watch("queryResult && queryResult.getStatus()", function(status) {
      if (!status) {
        return;
      }

      if (status == 'done') {
        if ($scope.query.id &&
          $scope.query.latest_query_data_id != $scope.queryResult.getId() &&
          $scope.query.query_hash == $scope.queryResult.query_result.query_hash) {
          Query.save({
            'id': $scope.query.id,
            'latest_query_data_id': $scope.queryResult.getId()
          })
        }
        $scope.query.latest_query_data_id = $scope.queryResult.getId();
        $scope.query.queryResult = $scope.queryResult;

        notifications.showNotification("re:dash", $scope.query.name + " updated.");
      } else if (status == 'failed') {
        notifications.showNotification("re:dash", $scope.query.name + " failed to run: " + $scope.queryResult.getError());
      }

      if (status === 'done' || status === 'failed') {
        $scope.lockButton(false);
      }

      if ($scope.queryResult.getLog() != null) {
          $scope.showLog = true;
      }
    });

    $scope.openScheduleForm = function() {
      if (!$scope.isQueryOwner) {
        return;
      };

      $modal.open({
        templateUrl: '/views/schedule_form.html',
        size: 'sm',
        scope: $scope,
        controller: ['$scope', '$modalInstance', function($scope, $modalInstance) {
          $scope.close = function() {
            $modalInstance.close();
          }
          if ($scope.query.hasDailySchedule()) {
            $scope.refreshType = 'daily';
          } else {
            $scope.refreshType = 'periodic';
          }
        }]
      });
    };

    $scope.$watch(function() {
      return $location.hash()
    }, function(hash) {
      if (hash == 'pivot') {
        Events.record(currentUser, 'pivot', 'query', $scope.query && $scope.query.id);
      }
      $scope.selectedTab = hash || DEFAULT_TAB;
    });
  };

  angular.module('redash.controllers')
    .controller('QueryViewCtrl',
      ['$scope', 'Events', '$route', '$location', 'notifications', 'growl', '$modal', 'Query', 'DataSource', QueryViewCtrl]);
})();
