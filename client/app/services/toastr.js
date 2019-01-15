// eslint-disable-next-line import/no-mutable-exports
export let toastr = null;

export default function init(ngModule) {
  ngModule.run(($injector) => {
    toastr = $injector.get('toastr');
  });
}

init.init = true;
