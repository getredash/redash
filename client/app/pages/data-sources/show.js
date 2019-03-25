import { find } from 'lodash';
import debug from 'debug';
import template from './show.html';
import notification from '@/services/notification';

const logger = debug('redash:http');
export const deleteConfirm = { class: 'btn-warning', title: 'Delete' };
export function logAndNotifyError(deleteObject, httpResponse) {
  logger('Failed to delete ' + deleteObject + ': ', httpResponse.status, httpResponse.statusText, httpResponse.data);
  notification.error('Failed to delete ' + deleteObject + '.');
}
export function notifySuccessAndPath(deleteObject, deletePath, $location) {
  notification.success(deleteObject + ' deleted successfully.');
  $location.path('/' + deletePath + '/');
}

function DataSourceCtrl(
  $scope, $route, $routeParams, $http, $location,
  currentUser, AlertDialog, DataSource,
) {
  $scope.dataSource = $route.current.locals.dataSource;
  $scope.dataSourceId = $routeParams.dataSourceId;
  $scope.types = $route.current.locals.types;
  $scope.type = find($scope.types, { type: $scope.dataSource.type });
  $scope.canChangeType = $scope.dataSource.id === undefined;

  $scope.helpLinks = {
    athena: 'https://redash.io/help/data-sources/amazon-athena-setup',
    bigquery: 'https://redash.io/help/data-sources/bigquery-setup',
    url: 'https://redash.io/help/data-sources/querying-urls',
    mongodb: 'https://redash.io/help/data-sources/mongodb-setup',
    google_spreadsheets: 'https://redash.io/help/data-sources/querying-a-google-spreadsheet',
    google_analytics: 'https://redash.io/help/data-sources/google-analytics-setup',
    axibasetsd: 'https://redash.io/help/data-sources/axibase-time-series-database',
    results: 'https://redash.io/help/user-guide/querying/query-results-data-source',
  };

  $scope.$watch('dataSource.id', (id) => {
    if (id !== $scope.dataSourceId && id !== undefined) {
      $location.path(`/data_sources/${id}`).replace();
    }
  });

  $scope.setType = (type) => {
    $scope.type = type;
    $scope.dataSource.type = type.type;
  };

  $scope.resetType = () => {
    $scope.type = undefined;
    $scope.dataSource = new DataSource({ options: {} });
  };

  function deleteDataSource(callback) {
    const doDelete = () => {
      $scope.dataSource.$delete(() => {
        notifySuccessAndPath('Data source', 'data_sources', $location);
      }, (httpResponse) => {
        logAndNotifyError('data source', httpResponse);
      });
    };

    const deleteTitle = 'Delete Data source';
    const deleteMessage = `Are you sure you want to delete the "${$scope.dataSource.name}" data source?`;

    AlertDialog.open(deleteTitle, deleteMessage, deleteConfirm).then(doDelete, callback);
  }

  function testConnection(callback) {
    DataSource.test({ id: $scope.dataSource.id }, (httpResponse) => {
      if (httpResponse.ok) {
        notification.success('Success');
      } else {
        notification.error('Connection Test Failed:', httpResponse.message, { duration: 10 });
      }
      callback();
    }, (httpResponse) => {
      logger('Failed to test data source: ', httpResponse.status, httpResponse.statusText, httpResponse);
      notification.error('Connection Test Failed:', 'Unknown error occurred while performing connection test. Please try again later.', { duration: 10 });
      callback();
    });
  }

  $scope.actions = [
    { name: 'Delete', type: 'danger', callback: deleteDataSource },
    {
      name: 'Test Connection', pullRight: true, callback: testConnection, disableWhenDirty: true,
    },
  ];
}

export default function init(ngModule) {
  ngModule.controller('DataSourceCtrl', DataSourceCtrl);

  return {
    '/data_sources/new': {
      template,
      controller: 'DataSourceCtrl',
      title: 'Datasources',
      resolve: {
        dataSource: (DataSource) => {
          'ngInject';

          return new DataSource({ options: {} });
        },
        types: ($http) => {
          'ngInject';

          return $http.get('api/data_sources/types').then(response => response.data);
        },
      },
    },
    '/data_sources/:dataSourceId': {
      template,
      controller: 'DataSourceCtrl',
      title: 'Datasources',
      resolve: {
        dataSource: (DataSource, $route) => {
          'ngInject';

          return DataSource.get({ id: $route.current.params.dataSourceId }).$promise;
        },
        types: ($http) => {
          'ngInject';

          return $http.get('api/data_sources/types').then(response => response.data);
        },
      },
    },
  };
}

init.init = true;
