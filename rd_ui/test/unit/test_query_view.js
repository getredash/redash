'use strict';

describe('QueryViewCtrl', function() {
  var scope;
  var mockData;

  beforeEach(module('redash', 'redashMocks'));

  beforeEach(inject(function($injector, $controller, $rootScope, Query, _mockData_) {
    mockData = _mockData_;
    scope = $rootScope.$new();

    var route = {
      current: {
        locals: {
          query: new Query(mockData.query)
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
    scope.cancelExecution();
    expect(scope.queryExecuting).toBe(false);
  });

});
