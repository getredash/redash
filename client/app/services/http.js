// eslint-disable-next-line import/no-mutable-exports
export let $http = null;

export default function init(ngModule) {
  ngModule.run(($injector) => {
    $http = $injector.get('$http');
  });
}

init.init = true;

