function GetDataSourceVersionCtrl(Events, toastr, $scope, DataSource) {
  // 'ngInject';

  this.getDataSourceVersion = DataSource.version({ id: 6 });
}

const GetDataSourceVersionInfo = {
  bindings: {
    schema: '<',
    onRefresh: '&',
  },
  controller: GetDataSourceVersionCtrl,
  template: '<span>{{ $ctrl.getDataSourceVersion.message }}</span>',
};

export default function (ngModule) {
  ngModule.component('getDataSourceVersion', GetDataSourceVersionInfo);
}
