export let $http = null; // eslint-disable-line import/no-mutable-exports
export let $uibModal = null; // eslint-disable-line import/no-mutable-exports
export let toastr = null; // eslint-disable-line import/no-mutable-exports

export default function init(ngModule) {
  ngModule.run(($injector) => {
    $http = $injector.get('$http');
    $uibModal = $injector.get('$uibModal');
    toastr = $injector.get('toastr');
  });
}

init.init = true;

