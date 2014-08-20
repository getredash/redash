'use strict';

describe('VisualizationRenderer', function() {
  var element;
  var scope;

  var filters = [{
    "name": "name::filter",
    "friendlyName": "Name",
    "values": ["test@example.com", "amirn@example.com"],
    "multiple": false
  }];

  beforeEach(module('redash', 'redashMocks'));

  // loading templates
  beforeEach(module('app/views/grid_renderer.html',
    'app/views/visualizations/filters.html'));

  // serving templates
  beforeEach(inject(function($httpBackend, $templateCache) {
    $httpBackend.whenGET('/views/grid_renderer.html')
      .respond($templateCache.get('app/views/grid_renderer.html'));

    $httpBackend.whenGET('/views/visualizations/filters.html')
      .respond($templateCache.get('app/views/visualizations/filters.html'));
  }));

  // directive setup
  beforeEach(inject(function($rootScope, $compile, MockData, QueryResult) {
    var qr = new QueryResult(MockData.queryResult)
    qr.filters = filters;

    $rootScope.queryResult = qr;

    element = angular.element(
      '<visualization-renderer query-result="queryResult">' +
      '</visualization-renderer>');
  }));


  describe('scope', function() {
    beforeEach(inject(function($rootScope, $compile) {
      $compile(element)($rootScope);

      // we will test the isolated scope of the directive
      scope = element.isolateScope();
      scope.$digest();
    }));

    it('should have filters', function() {
      expect(scope.filters).toBeDefined();
    });
  });


  /*describe('URL binding', function() {

    beforeEach(inject(function($rootScope, $compile, $location) {
      spyOn($location, 'search').andCallThrough();

      // set initial search
      var initialSearch = {};
      initialSearch[filters[0].friendlyName] = filters[0].values[0];
      $location.search('filters', initialSearch);

      $compile(element)($rootScope);

      // we will test the isolated scope of the directive
      scope = element.isolateScope();
      scope.$digest();
    }));

    it('should update scope from URL',
      inject(function($location) {
        expect($location.search).toHaveBeenCalled();
        expect(scope.filters[0].current).toEqual(filters[0].values[0]);
      }));

    it('should update URL from scope',
      inject(function($location) {
        scope.filters[0].current = 'newValue';
        scope.$digest();

        var searchFilters = angular.fromJson($location.search().filters);
        expect(searchFilters[filters[0].friendlyName]).toEqual('newValue');
    }));
  });*/
});
