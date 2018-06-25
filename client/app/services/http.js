// eslint-disable-next-line import/no-mutable-exports
export let $http = null;

export default function register(ngModule) {
  ngModule.run(($injector) => {
    $http = $injector.get('$http');
  });
}
