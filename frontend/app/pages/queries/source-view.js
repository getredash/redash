import template from './query.html';

function QuerySourceCtrl(Events, toastr, $controller, $scope, $location, $http, $q,
  currentUser, Query, Visualization, KeyboardShortcuts) {
  // extends QueryViewCtrl
  $controller('QueryViewCtrl', { $scope });
  // TODO:
  // This doesn't get inherited. Setting it on this didn't work either (which is weird).
  // Obviously it shouldn't be repeated, but we got bigger fish to fry.
  const DEFAULT_TAB = 'table';

  Events.record(currentUser, 'view_source', 'query', $scope.query.id);

  const isNewQuery = !$scope.query.id;
  let queryText = $scope.query.query;
  const saveQuery = $scope.saveQuery;

  $scope.sourceMode = true;
  $scope.canEdit = currentUser.canEdit($scope.query) || $scope.query.can_edit;
  $scope.isDirty = false;
  $scope.base_url = `${$location.protocol()}://${$location.host()}:${$location.port()}`;

  $scope.newVisualization = undefined;

  // @override
  Object.defineProperty($scope, 'showDataset', {
    get() {
      return $scope.queryResult && $scope.queryResult.getStatus() === 'done';
    },
  });

  const shortcuts = {
    'meta+s': function save() {
      if ($scope.canEdit) {
        $scope.saveQuery();
      }
    },
    'ctrl+s': function save() {
      if ($scope.canEdit) {
        $scope.saveQuery();
      }
    },
    // Cmd+Enter for Mac
    'meta+enter': $scope.executeQuery,
    // Ctrl+Enter for PC
    'ctrl+enter': $scope.executeQuery,
  };

  KeyboardShortcuts.bind(shortcuts);

  // @override
  $scope.saveQuery = (options, data) => {
    const savePromise = saveQuery(options, data);

    savePromise.then((savedQuery) => {
      queryText = savedQuery.query;
      $scope.isDirty = $scope.query.query !== queryText;
      // update to latest version number
      $scope.query.version = savedQuery.version;

      if (isNewQuery) {
        // redirect to new created query (keep hash)
        $location.path(savedQuery.getSourceLink());
      }
    });

    return savePromise;
  };

  $scope.formatQuery = () => {
    Query.format($scope.dataSource.syntax, $scope.query.query)
      .then((query) => { $scope.query.query = query; })
      .catch(error => toastr.error(error));
  };

  $scope.duplicateQuery = () => {
    Events.record(currentUser, 'fork', 'query', $scope.query.id);
    $scope.query.name = `Copy of (#${$scope.query.id}) ${$scope.query.name}`;
    $scope.query.id = null;
    $scope.query.schedule = null;
    $scope.saveQuery({
      successMessage: 'Query forked',
      errorMessage: 'Query could not be forked',
    }).then((savedQuery) => {
      // redirect to forked query (clear hash)
      $location.url(savedQuery.getSourceLink()).replace();
    });
  };

  $scope.deleteVisualization = ($e, vis) => {
    $e.preventDefault();
    if (confirm(`Are you sure you want to delete ${vis.name} ?`)) {
      Events.record(currentUser, 'delete', 'visualization', vis.id);

      Visualization.delete(vis, () => {
        if ($scope.selectedTab === vis.id) {
          $scope.selectedTab = DEFAULT_TAB;
          $location.hash($scope.selectedTab);
        }
        $scope.query.visualizations = $scope.query.visualizations.filter(v => vis.id !== v.id);
      }, () => {
        toastr.error("Error deleting visualization. Maybe it's used in a dashboard?");
      });
    }
  };

  $scope.$watch('query.query', (newQueryText) => {
    $scope.isDirty = (newQueryText !== queryText);
  });

  $scope.$on('$destroy', () => {
    KeyboardShortcuts.unbind(shortcuts);
  });
}

export default function (ngModule) {
  ngModule.controller('QuerySourceCtrl', QuerySourceCtrl);

  function getQuery(Query, $route) {
    const query = Query.get({ id: $route.current.params.queryId });
    return query.$promise;
  }

  return {
    '/queries/new': {
      template,
      controller: 'QuerySourceCtrl',
      reloadOnSearch: false,
      resolve: {
        query: function newQuery(Query) {
          return Query.newQuery();
        },
        dataSources(DataSource) {
          return DataSource.query().$promise;
        },
      },
    },
    '/queries/:queryId/source': {
      template,
      controller: 'QuerySourceCtrl',
      reloadOnSearch: false,
      resolve: {
        query: getQuery,
      },
    },
  };
}
