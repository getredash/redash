import template from './list.html';

function DataSourcesCtrl($scope, $location, currentUser, Events, DataSource) {
  Events.record('view', 'page', 'admin/data_sources');

  $scope.dataSources = DataSource.query();
}

export default function (ngModule) {
  ngModule.controller('DataSourcesCtrl', DataSourcesCtrl);

  return {
    '/data_sources': {
      template,
      controller: 'DataSourcesCtrl',
      title: 'Data Sources',
    },
  };
}
