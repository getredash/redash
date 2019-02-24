import { map, defer } from 'lodash';
import template from './query.html';
import EditParameterSettingsDialog from '@/components/EditParameterSettingsDialog';

function QuerySourceCtrl(
  Events,
  $controller,
  $scope,
  $location,
  $uibModal,
  currentUser,
  KeyboardShortcuts,
  $rootScope,
) {
  // extends QueryViewCtrl
  $controller('QueryViewCtrl', { $scope });

  Events.record('view_source', 'query', $scope.query.id);

  const isNewQuery = !$scope.query.id;
  let queryText = $scope.query.query;
  const saveQuery = $scope.saveQuery;

  $scope.sourceMode = true;
  $scope.isDirty = false;
  $scope.base_url = `${$location.protocol()}://${$location.host()}:${$location.port()}`;
  $scope.modKey = KeyboardShortcuts.modKey;

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
    'mod+p': () => {
      $scope.addNewParameter();
    },
  };

  KeyboardShortcuts.bind(shortcuts);

  $scope.$on('$destroy', () => {
    KeyboardShortcuts.unbind(shortcuts);
  });

  $scope.canForkQuery = () => currentUser.hasPermission('edit_query') && !$scope.dataSource.view_only;

  $scope.updateQuery = newQueryText => defer(() => $scope.$apply(() => { $scope.query.query = newQueryText; }));

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

  $scope.addNewParameter = () => {
    EditParameterSettingsDialog
      .showModal({
        parameter: {
          title: null,
          name: '',
          type: 'text',
          value: null,
        },
        existingParams: map($scope.query.getParameters().get(), p => p.name),
      })
      .result.then((param) => {
        param = $scope.query.getParameters().add(param);
        $rootScope.$broadcast('query-editor.command', 'paste', param.toQueryTextFragment());
        $rootScope.$broadcast('query-editor.command', 'focus');
      });
  };

  $scope.listenForEditorCommand = f => $scope.$on('query-editor.command', f);
  $scope.listenForResize = f => $scope.$parent.$on('angular-resizable.resizing', f);

  $scope.$watch('query.query', (newQueryText) => {
    $scope.isDirty = newQueryText !== queryText;
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

init.init = true;
