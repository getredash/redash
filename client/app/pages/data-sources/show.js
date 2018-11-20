import { find } from 'lodash';
import debug from 'debug';
import template from './show.html';

const logger = debug('redash:http');
const deleteConfirm = { class: 'btn-warning', title: 'Delete' };
function logAndToastrError(deleteObject, httpResponse, toastr) {
  logger('Failed to delete ' + deleteObject + ': ', httpResponse.status, httpResponse.statusText, httpResponse.data);
  toastr.error('Failed to delete ' + deleteObject + '.');
}
function toastrSuccessAndPath(deleteObject, deletePath, toastr, $location) {
  toastr.success(deleteObject + ' deleted successfully.');
  $location.path('/' + deletePath + '/');
}

function DataSourceCtrl(
  $scope, $route, $routeParams, $http, $location, toastr,
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
        toastrSuccessAndPath('Data source', 'data_sources', toastr, $location);
      }, (httpResponse) => {
        logAndToastrError('data source', httpResponse, toastr);
      });
    };

    const deleteTitle = 'Delete Data source';
    const deleteMessage = `Are you sure you want to delete the "${$scope.dataSource.name}" data source?`;

    AlertDialog.open(deleteTitle, deleteMessage, deleteConfirm).then(doDelete, callback);
  }

  function testConnection(callback) {
    DataSource.test({ id: $scope.dataSource.id }, (httpResponse) => {
      if (httpResponse.ok) {
        toastr.success('Success');
      } else {
        toastr.error(httpResponse.message, 'Connection Test Failed:', { timeOut: 10000 });
      }
      callback();
    }, (httpResponse) => {
      logger('Failed to test data source: ', httpResponse.status, httpResponse.statusText, httpResponse);
      toastr.error('Unknown error occurred while performing connection test. Please try again later.', 'Connection Test Failed:', { timeOut: 10000 });
      callback();
    });
  }

  $scope.actions = [
    { name: 'Delete', class: 'btn-danger', callback: deleteDataSource },
    {
      name: 'Test Connection', class: 'btn-default pull-right', callback: testConnection, disableWhenDirty: true,
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

