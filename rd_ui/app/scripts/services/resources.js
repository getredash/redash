(function () {
  var QueryResult = function ($resource, $timeout) {
    var QueryResultResource = $resource('/api/query_results/:id', {id: '@id'}, {'post': {'method': 'POST'}});
    var Job = $resource('/api/jobs/:id', {id: '@id'});

    var updateFunction = function (props) {
      angular.extend(this, props);
      if ('query_result' in props) {
        this.status = "done";
        this.filters = undefined;
        this.filterFreeze = undefined;

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
      this.filters = undefined;
      this.filterFreeze = undefined;

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

    QueryResult.prototype.getId = function () {
      var id = null;
      if ('query_result' in this) {
        id = this.query_result.id;
      }
      return id;
    }

    QueryResult.prototype.cancelExecution = function () {
      Job.delete({id: this.job.id});
    }

    QueryResult.prototype.getStatus = function () {
      return this.status || statuses[this.job.status];
    }

    QueryResult.prototype.getError = function () {
      // TODO: move this logic to the server...
      if (this.job.error == "None") {
        return undefined;
      }

      return this.job.error;
    }

    QueryResult.prototype.getUpdatedAt = function () {
      return this.query_result.retrieved_at || this.job.updated_at * 1000.0 || this.updatedAt;
    }

    QueryResult.prototype.getRuntime = function () {
      return this.query_result.runtime;
    }

    QueryResult.prototype.getRawData = function () {
      if (!this.query_result.data) {
        return null;
      }

      var data = this.query_result.data.rows;

      return data;
    }

    QueryResult.prototype.getData = function () {
      if (!this.query_result.data) {
        return null;
      }

      var filterValues = function (filters) {
        if (!filters) {
          return null;
        }

        return _.reduce(filters, function (str, filter) {
          return str + filter.current;
        }, "")
      }

      var filters = this.getFilters();
      var filterFreeze = filterValues(filters);

      if (this.filterFreeze != filterFreeze) {
        this.filterFreeze = filterFreeze;

        if (filters) {
          this.filteredData = _.filter(this.query_result.data.rows, function (row) {
            return _.reduce(filters, function (memo, filter) {
              if (!_.isArray(filter.current)) {
                filter.current = [filter.current];
              };
              return (memo && _.some(filter.current, function(v) { return v == row[filter.name] }));
            }, true);
          });
        } else {
          this.filteredData = this.query_result.data.rows;
        }
      }

      return this.filteredData;
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

          if (type == 'multi-filter') {
            seriesName = String(value);
          }
        });

        var addPointToSeries = function (seriesName, point) {
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
          _.each(yValues, function (yValue, seriesName) {
            addPointToSeries(seriesName, {'x': xValue, 'y': yValue});
          });
        } else {
          addPointToSeries(seriesName, point);
        }
      });

      _.each(series, function (series) {
        series.data = _.sortBy(series.data, 'x');
      });

      return _.values(series);
    };

    QueryResult.prototype.getColumns = function () {
      if (this.columns == undefined && this.query_result.data) {
        this.columns = _.map(this.query_result.data.columns, function (v) {
          return v.name;
        });
      }

      return this.columns;
    }

    QueryResult.prototype.getColumnCleanName = function (column) {
      var parts = column.split('::');
      var name = parts[1];
      if (parts[0] != '') {
        // TODO: it's probably time to generalize this.
        // see also getColumnFriendlyName
        name = parts[0].replace(/%/g, '__pct').replace(/ /g, '_').replace(/\?/g, '');
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
      if (!this.filters) {
        this.prepareFilters();
      }

      return this.filters;
    };

    QueryResult.prototype.prepareFilters = function () {
      var filters = [];
      var filterTypes = ['filter', 'multi-filter'];
      _.each(this.getColumns(), function (col) {
        var type = col.split('::')[1]
        if (_.contains(filterTypes, type)) {
          // filter found
          var filter = {
            name: col,
            friendlyName: this.getColumnFriendlyName(col),
            values: [],
            multiple: (type=='multi-filter')
          }
          filters.push(filter);
        }
      }, this);

      _.each(this.getRawData(), function (row) {
        _.each(filters, function (filter) {
          filter.values.push(row[filter.name]);
          if (filter.values.length == 1) {
            filter.current = row[filter.name];
          }
        })
      });

      _.each(filters, function(filter) {
        filter.values = _.uniq(filter.values);
      });

      this.filters = filters;
    }

    var refreshStatus = function (queryResult, query, ttl) {
      Job.get({'id': queryResult.job.id}, function (response) {
        queryResult.update(response);

        if (queryResult.getStatus() == "processing" && queryResult.job.query_result_id && queryResult.job.query_result_id != "None") {
          QueryResultResource.get({'id': queryResult.job.query_result_id}, function (response) {
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

    QueryResult.get = function (data_source_id, query, ttl) {
      var queryResult = new QueryResult();

      QueryResultResource.post({'data_source_id': data_source_id, 'query': query, 'ttl': ttl}, function (response) {
        queryResult.update(response);

        if ('job' in response) {
          refreshStatus(queryResult, query, ttl);
        }
      });

      return queryResult;
    }

    return QueryResult;
  };

  var Query = function ($resource, QueryResult, DataSource) {
    var Query = $resource('/api/queries/:id', {id: '@id'});

    Query.newQuery = function () {
      return new Query({
        query: "",
        name: "New Query",
        ttl: -1,
        user: currentUser
      });
    };

    Query.prototype.getSourceLink = function () {
      return '/queries/' + this.id + '/source';
    };

    Query.prototype.getQueryResult = function (ttl) {
      if (ttl == undefined) {
        ttl = this.ttl;
      }

      var queryResult = null;
      if (this.latest_query_data && ttl != 0) {
        queryResult = new QueryResult({'query_result': this.latest_query_data});
      } else if (this.latest_query_data_id && ttl != 0) {
        queryResult = QueryResult.getById(this.latest_query_data_id);
      } else if (this.data_source_id) {
        queryResult = QueryResult.get(this.data_source_id, this.query, ttl);
      }

      return queryResult;
    };

    return Query;
  };

  var DataSource = function ($resource) {
    var DataSourceResource = $resource('/api/data_sources/:id', {id: '@id'}, {'get': {'method': 'GET', 'cache': true, 'isArray': true}});

    return DataSourceResource;
  }

  var Widget = function ($resource) {
    var WidgetResource = $resource('/api/widgets/:id', {id: '@id'});

    return WidgetResource;
  }

  angular.module('redash.services')
      .factory('QueryResult', ['$resource', '$timeout', QueryResult])
      .factory('Query', ['$resource', 'QueryResult', 'DataSource', Query])
      .factory('DataSource', ['$resource', DataSource])
      .factory('Widget', ['$resource', Widget]);
})();
