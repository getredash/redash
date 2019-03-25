import { pick, some, find, minBy, map, intersection, isArray, isObject } from 'lodash';
import { SCHEMA_NOT_SUPPORTED, SCHEMA_LOAD_ERROR } from '@/services/data-source';
import getTags from '@/services/getTags';
import { policy } from '@/services/policy';
import Notifications from '@/services/notifications';
import ScheduleDialog from '@/components/queries/ScheduleDialog';
import notification from '@/services/notification';
import template from './query.html';

const DEFAULT_TAB = 'table';

function QueryViewCtrl(
  $scope,
  Events,
  $route,
  $routeParams,
  $location,
  $window,
  $q,
  KeyboardShortcuts,
  Title,
  AlertDialog,
  clientConfig,
  $uibModal,
  currentUser,
  Query,
  DataSource,
  Visualization,
) {
  function getQueryResult(maxAge, selectedQueryText) {
    if (maxAge === undefined) {
      maxAge = $location.search().maxAge;
    }

    if (maxAge === undefined) {
      maxAge = -1;
    }

    $scope.showLog = false;
    if ($scope.isDirty) {
      $scope.queryResult = $scope.query.getQueryResultByText(maxAge, selectedQueryText);
    } else {
      $scope.queryResult = $scope.query.getQueryResult(maxAge);
    }
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
    const isValidDataSourceId = !isNaN(dataSourceId) && some($scope.dataSources, ds => ds.id === dataSourceId);

    if (!isValidDataSourceId) {
      dataSourceId = $scope.dataSources[0].id;
    }

    // Return our data source id
    return dataSourceId;
  }

  function getSchema(refresh = undefined) {
    // TODO: is it possible this will be called before dataSource is set?
    $scope.schema = [];
    $scope.dataSource.getSchema(refresh).then((data) => {
      if (data.schema) {
        $scope.schema = data.schema;
        $scope.schema.forEach((table) => {
          table.collapsed = true;
        });
      } else if (data.error.code === SCHEMA_NOT_SUPPORTED) {
        $scope.schema = undefined;
      } else if (data.error.code === SCHEMA_LOAD_ERROR) {
        notification.error('Schema refresh failed.', 'Please try again later.');
      } else {
        notification.error('Schema refresh failed.', 'Please try again later.');
      }
    });
  }

  $scope.refreshSchema = () => getSchema(true);

  function updateDataSources(dataSources) {
    // Filter out data sources the user can't query (or used by current query):
    function canUseDataSource(dataSource) {
      return !dataSource.view_only || dataSource.id === $scope.query.data_source_id;
    }
    $scope.dataSources = dataSources.filter(canUseDataSource);

    if ($scope.dataSources.length === 0) {
      $scope.noDataSources = true;
      return;
    }

    if ($scope.query.isNew()) {
      $scope.query.data_source_id = getDataSourceId();
    }

    $scope.dataSource = find(dataSources, ds => ds.id === $scope.query.data_source_id);

    $scope.canCreateQuery = some(dataSources, ds => !ds.view_only);

    getSchema();
  }

  $scope.updateSelectedQuery = (selectedQueryText) => {
    $scope.selectedQueryText = selectedQueryText;
  };

  $scope.executeQuery = () => {
    if (!$scope.canExecuteQuery()) {
      return;
    }

    if (!$scope.query.query) {
      return;
    }

    getQueryResult(0, $scope.selectedQueryText);
    $scope.lockButton(true);
    $scope.cancelling = false;
    Events.record('execute', 'query', $scope.query.id);

    Notifications.getPermissions();
  };

  $scope.selectedTab = DEFAULT_TAB;
  $scope.currentUser = currentUser;
  $scope.dataSource = {};
  $scope.query = $route.current.locals.query;
  $scope.showPermissionsControl = clientConfig.showPermissionsControl;

  const shortcuts = {
    'mod+enter': $scope.executeQuery,
    'alt+enter': $scope.executeQuery,
  };

  KeyboardShortcuts.bind(shortcuts);

  $scope.$on('$destroy', () => {
    KeyboardShortcuts.unbind(shortcuts);
  });

  if ($scope.query.hasResult() || $scope.query.paramsRequired()) {
    getQueryResult();
  }
  $scope.queryExecuting = false;

  $scope.isQueryOwner = currentUser.id === $scope.query.user.id || currentUser.hasPermission('admin');
  $scope.canEdit = currentUser.canEdit($scope.query) || $scope.query.can_edit;
  $scope.canViewSource = currentUser.hasPermission('view_source');

  $scope.canExecuteQuery = () => $scope.query.is_safe || (currentUser.hasPermission('execute_query') && !$scope.dataSource.view_only);

  $scope.canForkQuery = () => currentUser.hasPermission('edit_query') && !$scope.dataSource.view_only;

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
    $uibModal.open({
      component: 'apiKeyDialog',
      resolve: {
        query: $scope.query,
      },
    });
  };

  $scope.duplicateQuery = () => {
    // To prevent opening the same tab, name must be unique for each browser
    const tabName = 'duplicatedQueryTab' + Math.random().toString();

    $window.open('', tabName);
    Query.fork({ id: $scope.query.id }, (newQuery) => {
      const queryUrl = newQuery.getUrl(true);
      $window.open(queryUrl, tabName);
    });
  };

  $scope.saveTags = (tags) => {
    $scope.query.tags = tags;
    $scope.saveQuery({}, { tags: $scope.query.tags });
  };

  $scope.loadTags = () => getTags('api/queries/tags').then(tags => map(tags, t => t.name));

  $scope.saveQuery = (customOptions, data) => {
    let request = data;

    if (request) {
      // Don't save new query with partial data
      if ($scope.query.isNew()) {
        return $q.reject();
      }
      request.id = $scope.query.id;
      request.version = $scope.query.version;
    } else {
      request = pick($scope.query, [
        'schedule',
        'query',
        'id',
        'description',
        'name',
        'data_source_id',
        'options',
        'latest_query_data_id',
        'version',
        'is_draft',
      ]);
    }

    const options = Object.assign(
      {},
      {
        successMessage: 'Query saved',
        errorMessage: 'Query could not be saved',
      },
      customOptions,
    );

    if (options.force) {
      delete request.version;
    }

    function overwrite() {
      options.force = true;
      $scope.saveQuery(options, data);
    }

    return Query.save(
      request,
      (updatedQuery) => {
        notification.success(options.successMessage);
        $scope.query.version = updatedQuery.version;
      },
      (error) => {
        if (error.status === 409) {
          const errorMessage = 'It seems like the query has been modified by another user.';

          if ($scope.isQueryOwner) {
            const title = 'Overwrite Query';
            const message = errorMessage + '<br>Are you sure you want to overwrite the query with your version?';
            const confirm = { class: 'btn-warning', title: 'Overwrite' };

            AlertDialog.open(title, message, confirm).then(overwrite);
          } else {
            notification.error(
              'Changes not saved',
              errorMessage + ' Please copy/backup your changes and reload this page.',
              { duration: null },
            );
          }
        } else {
          notification.error(options.errorMessage);
        }
      },
    ).$promise;
  };

  $scope.togglePublished = () => {
    Events.record('toggle_published', 'query', $scope.query.id);
    $scope.query.is_draft = !$scope.query.is_draft;
    $scope.saveQuery(undefined, { is_draft: $scope.query.is_draft });
  };

  $scope.saveDescription = (desc) => {
    $scope.query.description = desc;
    Events.record('edit_description', 'query', $scope.query.id);
    $scope.saveQuery(undefined, { description: $scope.query.description });
  };

  $scope.saveName = (name) => {
    $scope.query.name = name;
    Events.record('edit_name', 'query', $scope.query.id);
    if ($scope.query.is_draft && clientConfig.autoPublishNamedQueries && $scope.query.name !== 'New Query') {
      $scope.query.is_draft = false;
    }

    $scope.saveQuery(undefined, { name: $scope.query.name, is_draft: $scope.query.is_draft });
  };

  $scope.cancelExecution = () => {
    $scope.cancelling = true;
    $scope.queryResult.cancelExecution();
    Events.record('cancel_execute', 'query', $scope.query.id);
  };

  $scope.archiveQuery = () => {
    function archive() {
      Query.delete(
        { id: $scope.query.id },
        () => {
          $scope.query.is_archived = true;
          $scope.query.schedule = null;
        },
        () => {
          notification.error('Query could not be archived.');
        },
      );
    }

    const title = 'Archive Query';
    const message =
      'Are you sure you want to archive this query?<br/> All alerts and dashboard widgets created with its visualizations will be deleted.';
    const confirm = { class: 'btn-warning', title: 'Archive' };

    AlertDialog.open(title, message, confirm).then(archive);
  };

  $scope.updateDataSource = () => {
    Events.record('update_data_source', 'query', $scope.query.id);
    localStorage.lastSelectedDataSourceId = $scope.query.data_source_id;

    $scope.query.latest_query_data = null;
    $scope.query.latest_query_data_id = null;

    if ($scope.query.id) {
      Query.save(
        {
          id: $scope.query.id,
          data_source_id: $scope.query.data_source_id,
          latest_query_data_id: null,
        },
        (updatedQuery) => {
          $scope.query.version = updatedQuery.version;
        },
      );
    }

    $scope.dataSource = find($scope.dataSources, ds => ds.id === $scope.query.data_source_id);
    getSchema();
    $scope.executeQuery();
  };

  $scope.setVisualizationTab = (visualization) => {
    $scope.selectedTab = visualization.id;
    $location.hash(visualization.id);
  };

  $scope.deleteVisualization = ($e, vis) => {
    $e.preventDefault();

    const title = undefined;
    const message = `Are you sure you want to delete ${vis.name} ?`;
    const confirm = { class: 'btn-danger', title: 'Delete' };

    AlertDialog.open(title, message, confirm).then(() => {
      Visualization.delete(
        { id: vis.id },
        () => {
          if ($scope.selectedTab === String(vis.id)) {
            $scope.selectedTab = DEFAULT_TAB;
            $location.hash($scope.selectedTab);
          }
          $scope.query.visualizations = $scope.query.visualizations.filter(v => vis.id !== v.id);
        },
        () => {
          notification.error('Error deleting visualization.', 'Maybe it\'s used in a dashboard?');
        },
      );
    });
  };

  $scope.$watch('query.name', () => {
    Title.set($scope.query.name);
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
      const ranSelectedQuery = $scope.query.query !== $scope.queryResult.query_result.query;
      if (!ranSelectedQuery) {
        $scope.query.latest_query_data_id = $scope.queryResult.getId();
        $scope.query.queryResult = $scope.queryResult;
      }

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

  function getVisualization(visId) {
    // eslint-disable-next-line eqeqeq
    return find($scope.query.visualizations, item => item.id == visId);
  }

  $scope.openVisualizationEditor = (visId) => {
    const visualization = getVisualization(visId);

    function openModal() {
      $uibModal.open({
        windowClass: 'modal-xl',
        component: 'editVisualizationDialog',
        resolve: {
          query: $scope.query,
          visualization,
          queryResult: $scope.queryResult,
          onNewSuccess: () => $scope.setVisualizationTab,
        },
      });
    }

    if ($scope.query.isNew()) {
      $scope.saveQuery().then((query) => {
        // Because we have a path change, we need to "signal" the next page to
        // open the visualization editor.
        // TODO: we don't really need this. Just need to assign query to $scope.query
        // and maybe a few more small changes. Not worth handling this now, but also
        // we shouldn't copy this bizzare method to the React codebase.
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
  const intervals = clientConfig.queryRefreshIntervals;
  const allowedIntervals = policy.getQueryRefreshIntervals();
  $scope.refreshOptions = isArray(allowedIntervals) ? intersection(intervals, allowedIntervals) : intervals;

  $scope.showScheduleForm = false;
  $scope.editSchedule = () => {
    if (!$scope.canEdit || !$scope.canScheduleQuery) {
      return;
    }
    ScheduleDialog.showModal({
      schedule: $scope.query.schedule,
      refreshOptions: $scope.refreshOptions,
    }).result.then((schedule) => {
      $scope.query.schedule = schedule;
      $scope.saveQuery();
    });
  };
  $scope.closeScheduleForm = () => {
    $scope.$apply(() => {
      $scope.showScheduleForm = false;
    });
  };

  $scope.openAddToDashboardForm = (visId) => {
    const visualization = getVisualization(visId);
    $uibModal.open({
      component: 'addToDashboardDialog',
      size: 'sm',
      resolve: {
        query: $scope.query,
        vis: visualization,
      },
    });
  };

  $scope.showEmbedDialog = (query, visId) => {
    const visualization = getVisualization(visId);
    $uibModal.open({
      component: 'embedCodeDialog',
      resolve: {
        query,
        visualization,
      },
    });
  };

  $scope.$watch(
    () => $location.hash(),
    (hash) => {
      // eslint-disable-next-line eqeqeq
      const exists = find($scope.query.visualizations, item => item.id == hash);
      let visualization = minBy($scope.query.visualizations, viz => viz.id);
      if (!isObject(visualization)) {
        visualization = {};
      }
      $scope.selectedTab = (exists ? hash : visualization.id) || DEFAULT_TAB;
    },
  );

  $scope.showManagePermissionsModal = () => {
    $uibModal.open({
      component: 'permissionsEditor',
      resolve: {
        aclUrl: { url: `api/queries/${$routeParams.queryId}/acl` },
        owner: $scope.query.user,
      },
    });
  };
}

export default function init(ngModule) {
  ngModule.controller('QueryViewCtrl', QueryViewCtrl);

  return {
    '/queries/:queryId': {
      template,
      layout: 'fixed',
      controller: 'QueryViewCtrl',
      reloadOnSearch: false,
      resolve: {
        query: (Query, $route) => {
          'ngInject';

          return Query.get({ id: $route.current.params.queryId }).$promise;
        },
      },
    },
  };
}

init.init = true;
