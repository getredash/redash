import { findWhere } from 'underscore';
import debug from 'debug';
import template from './show.html';

const logger = debug('redash:http');

function DataSourceCtrl(
  $scope, $route, $routeParams, $http, $location, toastr,
  currentUser, Events, DataSource,
) {
  Events.record('view', 'page', 'admin/data_source');

  $scope.dataSource = $route.current.locals.dataSource;
  $scope.dataSourceId = $routeParams.dataSourceId;
  $scope.types = $route.current.locals.types;
  $scope.type = findWhere($scope.types, { type: $scope.dataSource.type });
  $scope.canChangeType = $scope.dataSource.id === undefined;

  $scope.helpLinks = {
    athena: 'http://help.redash.io/article/122-amazon-athena-setup',
    bigquery: 'http://help.redash.io/article/124-bigquery-setup',
    url: 'http://help.redash.io/article/120-using-a-url-as-a-data-source',
    mongodb: 'http://help.redash.io/article/157-mongodb-setup',
    google_spreadsheets: 'http://help.redash.io/article/126-google-spreadsheets-setup',
    google_analytics: 'http://help.redash.io/article/125-google-analytics-setup',
    axibasetsd: 'http://help.redash.io/article/123-axibase-time-series-database',
    results: 'http://help.redash.io/article/152-query-results-data-source',
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
