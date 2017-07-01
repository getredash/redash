function GetDataSourceVersionCtrl(Events, toastr, $scope, DataSource, $route) {
  // 'ngInject';

  this.getDataSourceVersion = DataSource.version(
    {
      id: $route.current.locals.query.data_source_id,
    }
  );
}

const GetDataSourceVersionInfo = {
  bindings: {
    onRefresh: '&',
  },
  controller: GetDataSourceVersionCtrl,
  template: '<span>{{ $ctrl.getDataSourceVersion.message }}</span>',
};

export default function (ngModule) {
  ngModule.component('getDataSourceVersion', GetDataSourceVersionInfo);
}
