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
                    // We need to give the pivot table its own copy of the data, because its change
                    // it which interferes with other visualizations.
                    var data = $.extend(true, [], $scope.queryResult.getData());
                    $(element).pivotUI(data, {
                         renderers: $.pivotUtilities.renderers
                    }, true);
                }
            });
        }
    }
});