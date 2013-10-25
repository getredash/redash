(function () {
    var AdminStatusCtrl = function ($scope, $http, $timeout) {
        $scope.$parent.pageTitle = "System Status";

        var refresh = function () {
            $scope.refresh_time = moment().add('minutes', 1);
            $http.get('/status.json').success(function (data) {
                $scope.status = data;
            });

            $timeout(refresh, 59 * 1000);
        };

        refresh();
    }

    angular.module('redash.admin_controllers', [])
        .controller('AdminStatusCtrl', ['$scope', '$http', '$timeout', AdminStatusCtrl])
})();
