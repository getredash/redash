(function () {
  var PublicVisualizationCtrl = function ($scope, Events, $location, Query) {

    $scope.embed = true;
    $scope.visualization = seedData.visualization;
    $scope.query = seedData.visualization.query;

    query = new Query(seedData.visualization.query);

    //max age from querystring, default to -1
    maxAge = $location.search()['maxAge'];
    if (maxAge === undefined) {
      maxAge = -1;
    }

    qr = query.getQueryResult(maxAge, Query.collectParamsFromQueryString($location, query));

    $scope.queryResult = qr;
  };

  angular.module('redash.controllers')
         .controller('PublicVisualizationCtrl', ['$scope', 'Events', '$location', 'Query', PublicVisualizationCtrl])
})();
