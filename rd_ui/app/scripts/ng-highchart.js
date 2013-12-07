'use strict';

angular.module('highchart', [])
    .directive('chart', ['$timeout', function ($timeout) {
        return {
            restrict: 'E',
            template: '<div></div>',
            scope: {
                options: "=options",
                series: "=series"
            },
            transclude: true,
            replace: true,

            link: function (scope, element, attrs) {
                var chartsDefaults = {
                    chart: {
                        renderTo: element[0],
                        type: attrs.type || null,
                        height: attrs.height || null,
                        width: attrs.width || null
                    }
                };

                var deepCopy = true;
                var newSettings = {};
                $.extend(deepCopy, newSettings, chartsDefaults, scope.options);

                // Making sure that the DOM is ready before creating the chart element, so it gets proper width.
                $timeout(function(){
                    scope.chart = new Highcharts.Chart(newSettings);

                    //Update when charts data changes
                    scope.$watch(function () {
                        return (scope.series && scope.series.length) || 0;
                    }, function (length) {
                        if (!length || length == 0) {
                            scope.chart.showLoading();
                        } else {
                            while(scope.chart.series.length > 0) {
                                scope.chart.series[0].remove(true);
                            }

                            if (_.some(scope.series[0].data, function(p) { return angular.isString(p.x) })) {
                                scope.chart.xAxis[0].update({type: 'category'});
                                _.each(scope.series, function(s) {
                                    _.each(s.data, function(p) {
                                        p.name = p.x;
                                        delete p.x;
                                    })
                                })
                            } else {
                                scope.chart.xAxis[0].update({type: 'datetime'});
                            }

                            scope.chart.counters.color = 0;

                            _.each(scope.series, function(s) {
                                scope.chart.addSeries(s);
                            })

                            scope.chart.redraw();
                            scope.chart.hideLoading();
                        };
                    }, true);
                });


            }
        };

    }]);