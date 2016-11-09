import { pick, any, some, find } from 'underscore';
import template from './query.html';

function QueryViewCtrl($scope, Events, $route, $routeParams, $http, $location, $window,
  Notifications, clientConfig, toastr, $uibModal, currentUser, Query, DataSource) {
  const DEFAULT_TAB = 'table';

  function getQueryResult(maxAge) {
    if (maxAge === undefined) {
      maxAge = $location.search().maxAge;
    }

    if (maxAge === undefined) {
      maxAge = -1;
    }

    $scope.showLog = false;
    $scope.queryResult = $scope.query.getQueryResult(maxAge);
  }

  function getDataSourceId() {
    // Try to get the query's data source id
    let dataSourceId = $scope.query.data_source_id;

    // If there is no source yet, then parse what we have in localStorage
    //   e.g. `null` -> `NaN`, malformed data -> `NaN`, "1" -> 1
    if (dataSourceId === undefined) {
      dataSourceId = parseInt(localStorage.lastSelectedDataSourceId, 10);
    }

    // If we had an invalid value in localStorage (e.g. nothing, deleted source),
    // then use the first data source
    const isValidDataSourceId = !isNaN(dataSourceId) && some($scope.dataSources, ds =>
       ds.id === dataSourceId
    );

    if (!isValidDataSourceId) {
      dataSourceId = $scope.dataSources[0].id;
    }

    // Return our data source id
    return dataSourceId;
  }

  function updateSchema() {
    $scope.hasSchema = false;
    $scope.editorSize = 'col-md-12';
    DataSource.getSchema({ id: $scope.query.data_source_id }, (data) => {
      if (data && data.length > 0) {
        $scope.schema = data;
        data.forEach((table) => {
          table.collapsed = true;
        });

        $scope.editorSize = 'col-md-9';
        $scope.hasSchema = true;
      } else {
        $scope.schema = undefined;
        $scope.hasSchema = false;
        $scope.editorSize = 'col-md-12';
      }
    });
  }

  function updateDataSources(dataSources) {
    // Filter out data sources the user can't query (or used by current query):
    $scope.dataSources = dataSources.filter(dataSource =>
       !dataSource.view_only || dataSource.id === $scope.query.data_source_id
    );

    if ($scope.dataSources.length === 0) {
      $scope.noDataSources = true;
      return;
    }

    if ($scope.query.isNew()) {
      $scope.query.data_source_id = getDataSourceId();
    }

    $scope.dataSource = find(dataSources, ds => ds.id === $scope.query.data_source_id);

    $scope.canCreateQuery = any(dataSources, ds => !ds.view_only);

    updateSchema();
  }

  $scope.currentUser = currentUser;
  $scope.dataSource = {};
  $scope.query = $route.current.locals.query;
  $scope.showPermissionsControl = clientConfig.showPermissionsControl;


  Events.record(currentUser, 'view', 'query', $scope.query.id);
  if ($scope.query.hasResult() || $scope.query.paramsRequired()) {
    getQueryResult();
  }
  $scope.queryExecuting = false;

  $scope.isQueryOwner = (currentUser.id === $scope.query.user.id) || currentUser.hasPermission('admin');
  $scope.canViewSource = currentUser.hasPermission('view_source');

  $scope.canExecuteQuery = () => currentUser.hasPermission('execute_query') && !$scope.dataSource.view_only;

  $scope.canScheduleQuery = currentUser.hasPermission('schedule_query');

  if ($route.current.locals.dataSources) {
    $scope.dataSources = $route.current.locals.dataSources;
    updateDataSources($route.current.locals.dataSources);
  } else {
    $scope.dataSources = DataSource.query(updateDataSources);
  }

  // in view mode, latest dataset is always visible
  // source mode changes this behavior
  $scope.showDataset = true;
  $scope.showLog = false;

  $scope.lockButton = (lock) => {
    $scope.queryExecuting = lock;
  };

  $scope.showApiKey = () => {
    $window.alert(`API Key for this query:\n${$scope.query.api_key}`);
  };

  $scope.saveQuery = (options, data) => {
    if (data) {
      // Don't save new query with partial data
      if ($scope.query.isNew()) {
        return;
      }
      data.id = $scope.query.id;
      data.version = $scope.query.version;
    } else {
      data = pick($scope.query, ['schedule', 'query', 'id', 'description', 'name', 'data_source_id', 'options', 'latest_query_data_id', 'version']);
    }

    options = Object.assign({}, {
      successMessage: 'Query saved',
      errorMessage: 'Query could not be saved',
    }, options);

    return Query.save(data, (updatedQuery) => {
      toastr.success(options.successMessage);
      $scope.query.version = updatedQuery.version;
    }, (error) => {
      if (error.status === 409) {
        toastr.error('It seems like the query has been modified by another user. ' +
          'Please copy/backup your changes and reload this page.', { autoDismiss: false });
      } else {
        toastr.error(options.errorMessage);
      }
    }).$promise;
  };

  $scope.saveDescription = () => {
    Events.record(currentUser, 'edit_description', 'query', $scope.query.id);
    $scope.saveQuery(undefined, { description: $scope.query.description });
  };

  $scope.saveName = () => {
    Events.record(currentUser, 'edit_name', 'query', $scope.query.id);
    $scope.saveQuery(undefined, { name: $scope.query.name });
  };

  $scope.executeQuery = () => {
    if (!$scope.canExecuteQuery()) {
      return;
    }

    if (!$scope.query.query) {
      return;
    }

    getQueryResult(0);
    $scope.lockButton(true);
    $scope.cancelling = false;
    Events.record(currentUser, 'execute', 'query', $scope.query.id);

    Notifications.getPermissions();
  };

  $scope.cancelExecution = () => {
    $scope.cancelling = true;
    $scope.queryResult.cancelExecution();
    Events.record(currentUser, 'cancel_execute', 'query', $scope.query.id);
  };

  $scope.archiveQuery = (options, data) => {
    if (data) {
      data.id = $scope.query.id;
    } else {
      data = $scope.query;
    }

    $scope.isDirty = false;

    options = Object.assign({}, {
      successMessage: 'Query archived',
      errorMessage: 'Query could not be archived',
    }, options);

    return Query.delete({ id: data.id }, () => {
      $scope.query.is_archived = true;
      $scope.query.schedule = null;
      toastr.success(options.successMessage);
        // This feels dirty.
      $('#archive-confirmation-modal').modal('hide');
    }, (httpResponse) => {
      toastr.error(options.errorMessage);
    }).$promise;
  };

  $scope.updateDataSource = () => {
    Events.record(currentUser, 'update_data_source', 'query', $scope.query.id);
    localStorage.lastSelectedDataSourceId = $scope.query.data_source_id;

    $scope.query.latest_query_data = null;
    $scope.query.latest_query_data_id = null;

    if ($scope.query.id) {
      Query.save({
        id: $scope.query.id,
        data_source_id: $scope.query.data_source_id,
        latest_query_data_id: null,
      });
    }

    updateSchema();
    $scope.dataSource = find($scope.dataSources, ds => ds.id === $scope.query.data_source_id);
    $scope.executeQuery();
  };

  $scope.setVisualizationTab = (visualization) => {
    $scope.selectedTab = visualization.id;
    $location.hash(visualization.id);
  };

  $scope.$watch('query.name', () => {
    $scope.$parent.pageTitle = $scope.query.name;
  });

  $scope.$watch('queryResult && queryResult.getData()', (data) => {
    if (!data) {
      return;
    }

    $scope.filters = $scope.queryResult.getFilters();
  });

  $scope.$watch('queryResult && queryResult.getStatus()', (status) => {
    if (!status) {
      return;
    }

    if (status === 'done') {
      $scope.query.latest_query_data_id = $scope.queryResult.getId();
      $scope.query.queryResult = $scope.queryResult;

      Notifications.showNotification('Redash', `${$scope.query.name} updated.`);
    } else if (status === 'failed') {
      Notifications.showNotification('Redash', `${$scope.query.name} failed to run: ${$scope.queryResult.getError()}`);
    }

    if (status === 'done' || status === 'failed') {
      $scope.lockButton(false);
    }

    if ($scope.queryResult.getLog() != null) {
      $scope.showLog = true;
    }
  });

  $scope.openVisualizationEditor = (visualization) => {
    function openModal() {
      $uibModal.open({
        templateUrl: '/views/directives/visualization_editor.html',
        windowClass: 'modal-xl',
        scope: $scope,
        controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
          $scope.modalInstance = $modalInstance;
          $scope.visualization = visualization;
          $scope.close = function () {
            $modalInstance.close();
          };
        }],
      });
    }

    if ($scope.query.isNew()) {
      $scope.saveQuery().then((query) => {
        // Because we have a path change, we need to "signal" the next page to
        // open the visualization editor.
        $location.path(query.getSourceLink()).hash('add');
      });
    } else {
      openModal();
    }
  };

  if ($location.hash() === 'add') {
    $location.hash(null);
    $scope.openVisualizationEditor();
  }

  $scope.openScheduleForm = function () {
    if (!$scope.isQueryOwner || !$scope.canScheduleQuery) {
      return;
    }

    $uibModal.open({
      templateUrl: '/views/schedule_form.html',
      size: 'sm',
      scope: $scope,
      controller($scope, $modalInstance) {
        $scope.close = function () {
          $modalInstance.close();
        };
        if ($scope.query.hasDailySchedule()) {
          $scope.refreshType = 'daily';
        } else {
          $scope.refreshType = 'periodic';
        }
      },
    });
  };

  $scope.showEmbedDialog = function (query, visualization) {
    $modal.open({
      templateUrl: '/views/dialogs/embed_code.html',
      controller: ['$scope', '$modalInstance', function ($scope, $modalInstance) {
        $scope.close = function () {
          $modalInstance.close();
        };
        $scope.embedUrl = `${basePath}embed/query/${query.id}/visualization/${visualization.id}?api_key=${query.api_key}`;
        if (window.snapshotUrlBuilder) {
          $scope.snapshotUrl = snapshotUrlBuilder(query, visualization);
        }
      }],
    });
  };

  $scope.$watch(() =>
     $location.hash()
  , (hash) => {
    if (hash === 'pivot') {
      Events.record(currentUser, 'pivot', 'query', $scope.query && $scope.query.id);
    }
    $scope.selectedTab = hash || DEFAULT_TAB;
  });

  $scope.showManagePermissionsModal = function () {
    // Create scope for share permissions dialog and pass api path to it
    const scope = $scope.$new();
    $scope.apiAccess = `api/queries/${$routeParams.queryId}/acl`;

    $modal.open({
      scope,
      templateUrl: '/views/dialogs/manage_permissions.html',
      controller: 'ManagePermissionsCtrl',
    });
  };
}

export default function (ngModule) {
  ngModule.controller('QueryViewCtrl', QueryViewCtrl);

  function getQuery(Query, $route) {
    const query = Query.get({ id: $route.current.params.queryId });
    return query.$promise;
  }

  return {
    '/queries/:queryId': {
      template,
      controller: 'QueryViewCtrl',
      reloadOnSearch: false,
      resolve: {
        query: getQuery,
      },
    },
  };
}
