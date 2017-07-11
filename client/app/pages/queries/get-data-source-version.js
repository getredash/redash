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
  template: '<span ng-if=\'!$ctrl.getDataSourceVersion.message.includes("not")\'>{{ $ctrl.getDataSourceVersion.message  }}</span><span ng-if=\'$ctrl.getDataSourceVersion.message.includes("not")\' class=\'fa fa-exclamation-circle\' data-toggle=\'tooltip\' data-placement=\'right\' tooltip title=\'{{ $ctrl.getDataSourceVersion.message }}\'></span>',
};

export default function (ngModule) {
  ngModule.component('getDataSourceVersion', GetDataSourceVersionInfo);
}
