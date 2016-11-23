import debug from 'debug';
import template from './show.html';

const logger = debug('redash:http');

function DataSourceCtrl($scope, $routeParams, $http, $location, toastr,
  currentUser, Events, DataSource) {
  Events.record('view', 'page', 'admin/data_source');
  // $scope.$parent.pageTitle = 'Data Sources';

  $scope.dataSourceId = $routeParams.dataSourceId;

  if ($scope.dataSourceId === 'new') {
    $scope.dataSource = new DataSource({ options: {} });
  } else {
    $scope.dataSource = DataSource.get({ id: $routeParams.dataSourceId });
  }

  $scope.$watch('dataSource.id', (id) => {
    if (id !== $scope.dataSourceId && id !== undefined) {
      $location.path(`/data_sources/${id}`).replace();
    }
  });

  function deleteDataSource() {
    Events.record('delete', 'datasource', $scope.dataSource.id);

    $scope.dataSource.$delete(() => {
      toastr.success('Data source deleted successfully.');
      $location.path('/data_sources/');
    }, (httpResponse) => {
      logger('Failed to delete data source: ', httpResponse.status, httpResponse.statusText, httpResponse.data);
      toastr.error('Failed to delete data source.');
    });
  }

  function testConnection(callback) {
    Events.record('test', 'datasource', $scope.dataSource.id);

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
    { name: 'Test Connection', class: 'btn-default', callback: testConnection, disableWhenDirty: true },
  ];
}

export default function (ngModule) {
  ngModule.controller('DataSourceCtrl', DataSourceCtrl);

  return {
    '/data_sources/:dataSourceId': {
      template,
      controller: 'DataSourceCtrl',
    },
  };
}
