var renderers = angular.module('redash.renderers', []);

renderers.directive('pivotTableRenderer', function () {
    return {
        restrict: 'E',
        scope: {
            queryResult: '='
        },
        template: "",
        replace: false,
        link: function($scope, element, attrs) {
            $scope.$watch('queryResult && queryResult.getData()', function (data) {
                if (!data) {
                    return;
                }

                if ($scope.queryResult.getData() == null) {
                } else {
                    $(element).pivotUI($scope.queryResult.getData(), {
                         renderers: $.pivotUtilities.renderers
                    }, true);
                }
            });
        }
    }
});