(function () {
  var DestinationsCtrl = function ($scope, $location, growl, Events, Destination) {
    Events.record(currentUser, "view", "page", "admin/destinations");
    $scope.$parent.pageTitle = "Destinations";

    $scope.destinations = Destination.query();

    $scope.openDestination = function(destination) {
      $location.path('/destinations/' + destination.id);
    };

    $scope.deleteDestination = function(event, destination) {
      event.stopPropagation();
      Events.record(currentUser, "delete", "destination", destination.id);
      destination.$delete(function(resource) {
        growl.addSuccessMessage("Destination deleted successfully.");
        this.$parent.destinations = _.without(this.destinations, resource);
      }.bind(this), function(httpResponse) {
        console.log("Failed to delete destination: ", httpResponse.status, httpResponse.statusText, httpResponse.data);
        growl.addErrorMessage("Failed to delete destination.");
      });
    }
  };

  var DestinationCtrl = function ($scope, $routeParams, $http, $location, Events, Destination) {
    Events.record(currentUser, "view", "page", "admin/destination");
    $scope.$parent.pageTitle = "Destinations";

    $scope.destinationId = $routeParams.destinationId;

    if ($scope.destinationId == "new") {
      $scope.destination = new Destination({options: {}});
    } else {
      $scope.destination = Destination.get({id: $routeParams.destinationId});
    }

    $scope.$watch('destination.id', function(id) {
      if (id != $scope.destinationId && id !== undefined) {
        $location.path('/destinations/' + id).replace();
      }
    });
  };

  angular.module('redash.controllers')
    .controller('DestinationsCtrl', ['$scope', '$location', 'growl', 'Events', 'Destination', DestinationsCtrl])
    .controller('DestinationCtrl', ['$scope', '$routeParams', '$http', '$location', 'Events', 'Destination', DestinationCtrl])
})();
