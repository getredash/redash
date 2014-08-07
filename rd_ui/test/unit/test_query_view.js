'use strict';

describe('QueryViewCtrl', function() {
  var scope;
  var MockData;

  beforeEach(module('redash', 'redashMocks'));

  beforeEach(inject(function($injector, $controller, $rootScope, Query, _MockData_) {
    MockData = _MockData_;
    scope = $rootScope.$new();

    var route = {
      current: {
        locals: {
          query: new Query(MockData.query)
        }
      }
    };

    $controller('QueryViewCtrl', {$scope: scope, $route: route});
  }));

  it('should have a query', function() {
    expect(scope.query).toBeDefined();
  });

  it('should update the executing state', function() {
    expect(scope.queryExecuting).toBe(false);
    scope.executeQuery();
    expect(scope.queryExecuting).toBe(true);
  });

});
