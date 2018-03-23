import template from './query.html';

function QuerySourceCtrl(
  Events, toastr, $controller, $scope, $location, $http, $q,
  AlertDialog, currentUser, Query, Visualization, KeyboardShortcuts,
) {
  // extends QueryViewCtrl
  $controller('QueryViewCtrl', { $scope });
  // TODO:
  // This doesn't get inherited. Setting it on this didn't work either (which is weird).
  // Obviously it shouldn't be repeated, but we got bigger fish to fry.
  const DEFAULT_TAB = 'table';

  Events.record('view_source', 'query', $scope.query.id);

  const isNewQuery = !$scope.query.id;
  let queryText = $scope.query.query;
  const saveQuery = $scope.saveQuery;

  $scope.sourceMode = true;
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
    'mod+s': function save() {
      if ($scope.canEdit) {
        $scope.saveQuery();
      }
    },
  };

  KeyboardShortcuts.bind(shortcuts);

  $scope.$on('$destroy', () => {
    KeyboardShortcuts.unbind(shortcuts);
  });

  $scope.canForkQuery = () => currentUser.hasPermission('edit_query') && !$scope.dataSource.view_only;

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

  $scope.deleteVisualization = ($e, vis) => {
    $e.preventDefault();

    const title = undefined;
    const message = `Are you sure you want to delete ${vis.name} ?`;
    const confirm = { class: 'btn-danger', title: 'Delete' };

    AlertDialog.open(title, message, confirm).then(() => {
      Events.record('delete', 'visualization', vis.id);

      Visualization.delete({ id: vis.id }, () => {
        if ($scope.selectedTab === String(vis.id)) {
          $scope.selectedTab = DEFAULT_TAB;
          $location.hash($scope.selectedTab);
        }
        $scope.query.visualizations = $scope.query.visualizations.filter(v => vis.id !== v.id);
      }, () => {
        toastr.error("Error deleting visualization. Maybe it's used in a dashboard?");
      });
    });
  };

  $scope.$watch('query.query', (newQueryText) => {
    $scope.isDirty = (newQueryText !== queryText);
  });
}

export default function init(ngModule) {
  ngModule.controller('QuerySourceCtrl', QuerySourceCtrl);

  return {
    '/queries/new': {
      template,
      layout: 'fixed',
      controller: 'QuerySourceCtrl',
      reloadOnSearch: false,
      resolve: {
        query: function newQuery(Query) {
          'ngInject';

          return Query.newQuery();
        },
        dataSources(DataSource) {
          'ngInject';

          return DataSource.query().$promise;
        },
      },
    },
    '/queries/:queryId/source': {
      template,
      layout: 'fixed',
      controller: 'QuerySourceCtrl',
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
