let $injector;

const lazyInjector = {
  get $injector() {
    return {
      get get() {
        return $injector.get;
      },
    };
  },
  set $injector(_$injector) {
    $injector = _$injector;
  },
};

export default lazyInjector;
