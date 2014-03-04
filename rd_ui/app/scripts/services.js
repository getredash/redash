(function () {
    var QueryResult = function($resource, $timeout) {
        var QueryResultResource = $resource('/api/query_results/:id', {id: '@id'}, {'post': {'method': 'POST'}});
        var Job = $resource('/api/jobs/:id', {id: '@id'});

        var updateFunction = function (props) {
            angular.extend(this, props);
            if ('query_result' in props) {
                this.status = "done";

                _.each(this.query_result.data.rows, function (row) {
                    _.each(row, function (v, k) {
                        if (_.isString(v) && v.match(/^\d{4}-\d{2}-\d{2}/)) {
                            row[k] = moment(v);
                        }
                    });
                });
            } else if (this.job.status == 3) {
                this.status = "processing";
            } else {
                this.status = undefined;
            }
        }

        function QueryResult(props) {
            this.job = {};
            this.query_result = {};
            this.status = "waiting";

            this.updatedAt = moment();

            if (props) {
                updateFunction.apply(this, [props]);
            }
        }

        var statuses = {
            1: "waiting",
            2: "processing",
            3: "done",
            4: "failed"
        }

        QueryResult.prototype.update = updateFunction;

        QueryResult.prototype.getId = function() {
            var id = null;
            if ('query_result' in this) {
                id = this.query_result.id;
            }
            return id;
        }

        QueryResult.prototype.cancelExecution = function() {
            Job.delete({id: this.job.id});
        }

        QueryResult.prototype.getStatus = function() {
            return this.status || statuses[this.job.status];
        }

        QueryResult.prototype.getError = function() {
            // TODO: move this logic to the server...
            if (this.job.error == "None") {
                return undefined;
            }

            return this.job.error;
        }

        QueryResult.prototype.getUpdatedAt = function() {
            return this.query_result.retrieved_at || this.job.updated_at*1000.0 || this.updatedAt;
        }

        QueryResult.prototype.getRuntime = function() {
            return this.query_result.runtime;
        }

        QueryResult.prototype.getData = function() {
            if (!this.query_result.data) {
                return null;
            }

            var data = this.query_result.data.rows;
            return data;
        }

        QueryResult.prototype.getChartData = function () {
            var series = {};

            _.each(this.getData(), function (row) {
                var point = {};
                var seriesName = undefined;
                var xValue = 0;
                var yValues = {};

                _.each(row, function (value, definition) {
                    var type = definition.split("::")[1];
                    var name = definition.split("::")[0];

                    if (type == 'x') {
                        xValue = value;
                        point[type] = value;
                    }

                    if (type == 'y') {
                        yValues[name] = value;
                        point[type] = value;
                    }

                    if (type == 'series') {
                        seriesName = String(value);
                    }
                });

                var addPointToSeries = function(seriesName, point) {
                    if (series[seriesName] == undefined) {
                        series[seriesName] = {
                            name: seriesName,
                            type: 'column',
                            data: []
                        }
                    }

                    series[seriesName]['data'].push(point);
                }

                if (seriesName === undefined) {
                    _.each(yValues, function(yValue, seriesName) {
                        addPointToSeries(seriesName, {'x': xValue, 'y': yValue});
                    });
                } else {
                    addPointToSeries(seriesName, point);
                }
            });

            _.each(series, function(series) {
                series.data = _.sortBy(series.data, 'x');
            });

            return _.values(series);
        };

        QueryResult.prototype.getColumns = function () {
            if (this.columns == undefined) {
                this.columns = _.map(this.query_result.data.columns, function(v) {
                    return v.name;
                })
            }

            return this.columns;
        }

        QueryResult.prototype.getColumnCleanName = function (column) {
            var parts = column.split('::');
            var name = parts[1];
            if (parts[0] != '') {
                // TODO: it's probably time to generalize this.
                // see also getColumnFriendlyName
                name = parts[0].replace(/%/g, '__pct').replace(/ /g, '_').replace(/\?/g,'');
            }
            return name;
        }

        QueryResult.prototype.getColumnFriendlyName = function (column) {
            return this.getColumnCleanName(column).replace('__pct', '%').replace(/_/g, ' ').replace(/(?:^|\s)\S/g, function (a) {
                return a.toUpperCase();
            });
        }

        QueryResult.prototype.getColumnCleanNames = function () {
            return _.map(this.getColumns(), function (col) {
                return this.getColumnCleanName(col);
            }, this);
        }

        QueryResult.prototype.getColumnFriendlyNames = function () {
            return _.map(this.getColumns(), function (col) {
                return this.getColumnFriendlyName(col);
            }, this);
        }

        QueryResult.prototype.getFilters = function () {
            var filterNames = [];
            _.each(this.getColumns(), function (col) {
                if (col.split('::')[1] == 'filter') {
                    filterNames.push(col);
                }
            });

            var filterValues = [];
            _.each(this.getData(), function (row) {
                _.each(filterNames, function (filter, i) {
                    if (filterValues[i] == undefined) {
                        filterValues[i] = [];
                    }
                    filterValues[i].push(row[filter]);
                })
            });

            var filters = _.map(filterNames, function (filter, i) {
                var f = {
                    name: filter,
                    friendlyName: this.getColumnFriendlyName(filter),
                    values: _.uniq(filterValues[i])
                };

                f.current = f.values[0];
                return f;
            }, this);

            return filters;
        };

        var refreshStatus = function(queryResult, query, ttl) {
            Job.get({'id': queryResult.job.id}, function(response) {
                queryResult.update(response);

                if (queryResult.getStatus() == "processing" && queryResult.job.query_result_id && queryResult.job.query_result_id != "None") {
                    QueryResultResource.get({'id': queryResult.job.query_result_id}, function(response) {
                        queryResult.update(response);
                    });
                } else if (queryResult.getStatus() != "failed") {
                    $timeout(function () {
                        refreshStatus(queryResult, query, ttl);
                    }, 3000);
                }
            })
        }

        QueryResult.getById = function (id) {
            var queryResult = new QueryResult();

            QueryResultResource.get({'id': id}, function (response) {
                queryResult.update(response);
            });

            return queryResult;
        }

        QueryResult.get = function (query, ttl) {
            var queryResult = new QueryResult();

            QueryResultResource.post({'query': query, 'ttl': ttl}, function (response) {
                queryResult.update(response);

                if ('job' in response) {
                    refreshStatus(queryResult, query, ttl);
                }
            });

            return queryResult;
        }

        return QueryResult;
    };

    var Query = function ($resource, QueryResult) {
        var Query = $resource('/api/queries/:id', {id: '@id'});

        Query.prototype.getQueryResult = function(ttl) {
            if (ttl == undefined) {
                ttl = this.ttl;
            }


            var queryResult = null;
            if (this.latest_query_data && ttl != 0) {
                queryResult = new QueryResult({'query_result': this.latest_query_data});
            } else if (this.latest_query_data_id && ttl != 0) {
                queryResult = QueryResult.getById(this.latest_query_data_id);
            } else {
                queryResult = QueryResult.get(this.query, ttl);
            }

            return queryResult;
        };

        Query.prototype.getHash = function() {
            return [this.name, this.description, this.query].join('!#');
        };

        return Query;
    };

    angular.module('redash.services', [])
        .factory('QueryResult', ['$resource', '$timeout', QueryResult])
        .factory('Query', ['$resource', 'QueryResult', Query])
})();
