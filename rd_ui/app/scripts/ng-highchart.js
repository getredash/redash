(function () {
    'use strict';

    var defaultOptions = {
        title: {
            "text": null
        },
        xAxis: {
            type: 'datetime'
        },
        yAxis: {
            title: {
                text: null
            }
        },
        exporting: {
            chartOptions: {
                title: {
                    text: ''
                }
            },
            buttons: {
                contextButton: {
                    menuItems: [
                        {
                            text: 'Toggle % Stacking',
                            onclick: function () {
                                var newStacking = "normal";
                                if (this.series[0].options.stacking == "normal") {
                                    newStacking = "percent";
                                }

                                _.each(this.series, function (series) {
                                    series.update({stacking: newStacking}, true);
                                });
                            }
                        }
                    ]
                }
            }
        },
        credits: {
            enabled: false
        },
        plotOptions: {
            column: {
                stacking: "normal",
                pointPadding: 0,
                borderWidth: 1,
                groupPadding: 0,
                shadow: false,
                tooltip: {
                    valueDecimals: 2,
                    formatter: function () {
                        if (moment.isMoment(this.x)) {
                            var s = '<b>' + moment(this.x).format("DD/MM/YY HH:mm") + '</b>',
                                pointsCount = this.points.length;

                            $.each(this.points, function (i, point) {
                                s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + '</span>: ' +
                                    Highcharts.numberFormat(point.y);

                                if (pointsCount > 1 && point.percentage) {
                                    s += " (" + Highcharts.numberFormat(point.percentage) + "%)";
                                }
                            });
                        } else {
                            var s = "<b>" + this.points[0].key + "</b>";
                            $.each(this.points, function (i, point) {
                                s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + '</span>: ' +
                                    Highcharts.numberFormat(point.y);
                            });
                        }

                        return s;
                    },
                    shared: true
                }
            },
            line: {
                dataLabels: {
                    enabled: true
                }
            },
            scatter: {
                marker: {
                    radius: 5,
                    states: {
                        hover: {
                            enabled: true,
                            lineColor: 'rgb(100,100,100)'
                        }
                    }
                },
                states: {
                    hover: {
                        marker: {
                            enabled: false
                        }
                    }
                }
            }
        },
        series: []
    };

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

                    var chartOptions = $.extend(true, {}, defaultOptions, chartsDefaults);

                    // Update when options change
                    scope.$watch('options', function (newOptions) {
                        initChart(newOptions);
                    }, true);

                    //Update when charts data changes
                    scope.$watch(function () {
                        return (scope.series && scope.series.length) || 0;
                    }, function (length) {
                        if (!length || length == 0) {
                            scope.chart.showLoading();
                        } else {
                            drawChart();
                        }
                        ;
                    }, true);

                    function initChart(options) {
                        if (scope.chart) {
                            scope.chart.destroy();
                        }

                        $.extend(true, chartOptions, options);

                        scope.chart = new Highcharts.Chart(chartOptions);
                        drawChart();
                    }

                    function drawChart() {
                        while (scope.chart.series.length > 0) {
                            scope.chart.series[0].remove(true);
                        }

                        // todo series.type

                        if (_.some(scope.series[0].data, function (p) {
                            return angular.isString(p.x)
                        })) {
                            scope.chart.xAxis[0].update({type: 'category'});

                            // We need to make sure that for each category, each series has a value.
                            var categories = _.union.apply(this, _.map(scope.series, function (s) {
                                return _.pluck(s.data, 'x')
                            }));

                            _.each(scope.series, function (s) {
                                // TODO: move this logic to Query#getChartData
                                var yValues = _.groupBy(s.data, 'x');

                                var newData = _.sortBy(_.map(categories, function (category) {
                                    return {
                                        name: category,
                                        y: yValues[category] && yValues[category][0].y
                                    }
                                }), 'name');

                                s.data = newData;
                            });
                        } else {
                            scope.chart.xAxis[0].update({type: 'datetime'});
                        }

                        scope.chart.counters.color = 0;

                        _.each(scope.series, function (s) {
                            // here we override the series with the visualization config
                            var _s = $.extend(true, {}, s, chartOptions['series']);
                            scope.chart.addSeries(_s);
                        })

                        scope.chart.redraw();
                        scope.chart.hideLoading();
                    }

                }
            };

        }]);
})();