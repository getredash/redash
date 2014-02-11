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
        tooltip: {
            valueDecimals: 2,
            formatter: function () {
                if (!this.points) {
                    this.points = [this.point];
                };

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
                    var points = this.points;
                    var name = points[0].key || points[0].name;

                    var s = "<b>" + name + "</b>";

                    $.each(points, function (i, point) {
                        if (points.length > 1) {
                            s += '<br/><span style="color:' + point.series.color + '">' + point.series.name + '</span>: ' + Highcharts.numberFormat(point.y);
                        } else {
                            s += ": " + Highcharts.numberFormat(point.y);
                            if (point.percentage < 100) {
                                s += ' (' +Highcharts.numberFormat(point.percentage) +  '%)';
                            }
                        }
                    });
                }

                return s;
            },
            shared: true
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
            area: {
                marker: {
                    enabled: false,
                    symbol: 'circle',
                    radius: 2,
                    states: {
                        hover: {
                            enabled: true
                        }
                    }
                }
            },
            column: {
                stacking: "normal",
                pointPadding: 0,
                borderWidth: 1,
                groupPadding: 0,
                shadow: false
            },
            line: {
                marker: {
                    radius: 1
                },
                lineWidth: 2,
                states: {
                    hover: {
                        lineWidth: 2,
                        marker: {
                            radius: 3
                        }
                    }
                }
            },
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    color: '#000000',
                    connectorColor: '#000000',
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %'
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
                tooltip: {
                    headerFormat: '<b>{series.name}</b><br>',
                    pointFormat: '{point.x}, {point.y}'
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

                    // $timeout makes sure that this function invoked after the DOM ready. When draw/init
                    // invoked after the DOM is ready, we see first an empty HighCharts objects and later
                    // they get filled up. Which gives the feeling that the charts loading faster (otherwise
                    // we stare at an empty screen until the HighCharts object is ready).
                    $timeout(function(){
                        // Update when options change
                        scope.$watch('options', function (newOptions) {
                            initChart(newOptions);
                        }, true);

                        //Update when charts data changes
                        scope.$watch(function () {
                            // TODO: this might be an issue in case the series change, but they stay
                            // with the same length
                            return (scope.series && scope.series.length) || 0;
                        }, function (length) {
                            if (!length || length == 0) {
                                scope.chart.showLoading();
                            } else {
                                drawChart();
                            };
                        }, true);
                    });

                    function initChart(options) {
                        if (scope.chart) {
                            scope.chart.destroy();
                        };

                        $.extend(true, chartOptions, options);

                        scope.chart = new Highcharts.Chart(chartOptions);
                        drawChart();
                    }

                    function drawChart() {
                        while (scope.chart.series.length > 0) {
                            scope.chart.series[0].remove(false);
                        };

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
                            s = _.extend(s, chartOptions['series']);

                            if (s.type == 'area') {
                                _.each(s.data, function (p) {
                                    // This is an insane hack: somewhere deep in HighChart's code,
                                    // when you stack areas, it tries to convert the string representation
                                    // of point's x into a number. With the default implementation of toString
                                    // it fails....

                                    if (moment.isMoment(p.x)) {
                                        p.x.toString = function () {
                                            return String(this.toDate().getTime());
                                        };
                                    }
                                });
                            };

                            scope.chart.addSeries(s, false);
                        });

                        scope.chart.redraw();
                        scope.chart.hideLoading();
                    }

                }
            };

        }]);
})();