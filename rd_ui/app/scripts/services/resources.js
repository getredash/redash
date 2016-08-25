(function () {
  function QueryResultError(errorMessage) {
    this.errorMessage = errorMessage;
  }

  QueryResultError.prototype.getError = function() {
    return this.errorMessage;
  };

  QueryResultError.prototype.getStatus = function() {
    return 'failed';
  };

  QueryResultError.prototype.getData = function() {
    return null;
  };

  QueryResultError.prototype.getLog = function() {
    return null;
  };

  QueryResultError.prototype.getChartData = function() {
    return null;
  };

  var QueryResult = function ($resource, $timeout, $q) {
    var QueryResultResource = $resource('api/query_results/:id', {id: '@id'}, {'post': {'method': 'POST'}});
    var Job = $resource('api/jobs/:id', {id: '@id'});

    var updateFunction = function (props) {
      angular.extend(this, props);
      if ('query_result' in props) {
        this.status = "done";
        this.filters = undefined;
        this.filterFreeze = undefined;

        var columnTypes = {};

        // TODO: we should stop manipulating incoming data, and switch to relaying on the column type set by the backend.
        // This logic is prone to errors, and better be removed. Kept for now, for backward compatability.
        _.each(this.query_result.data.rows, function (row) {
          _.each(row, function (v, k) {
            if (angular.isNumber(v)) {
              columnTypes[k] = 'float';
            } else if (_.isString(v) && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
              row[k] = moment.utc(v);
              columnTypes[k] = 'datetime';
            } else if (_.isString(v) && v.match(/^\d{4}-\d{2}-\d{2}$/)) {
              row[k] = moment.utc(v);
              columnTypes[k] = 'date';
            } else if (typeof(v) == 'object' && v !== null) {
              row[k] = JSON.stringify(v);
            }
          }, this);
        }, this);

        _.each(this.query_result.data.columns, function(column) {
          if (columnTypes[column.name]) {
            if (column.type == null || column.type == 'string') {
              column.type = columnTypes[column.name];
            }
          }
        });

        this.deferred.resolve(this);
      } else if (this.job.status == 3) {
        this.status = "processing";
      } else {
        this.status = undefined;
      }
    };

    function QueryResult(props) {
      this.deferred = $q.defer();
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

    QueryResult.prototype.getLog = function() {
        if (!this.query_result.data  || !this.query_result.data.log || this.query_result.data.log.length == 0) {
            return null;
        }

        return this.query_result.data.log;
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

              return (memo && _.some(filter.current, function(v) {
                var value = row[filter.name];
                if (moment.isMoment(value)) {
                  return value.isSame(v);
                } else {
                  // We compare with either the value or the String representation of the value,
                  // because Select2 casts true/false to "true"/"false".
                  return (v == value || String(value) == v);
                }
              }));
            }, true);
          });
        } else {
          this.filteredData = this.query_result.data.rows;
        }
      }

      return this.filteredData;
    };

    /**
     * Helper function to add a point into a series
     */
    QueryResult.prototype._addPointToSeries = function (point, seriesCollection, seriesName) {
      if (seriesCollection[seriesName] == undefined) {
        seriesCollection[seriesName] = {
          name: seriesName,
          type: 'column',
          data: []
        };
      }

      seriesCollection[seriesName]['data'].push(point);
    };

    QueryResult.prototype.getChartData = function (mapping) {
      var series = {};

      _.each(this.getData(), function (row) {
        var point = {};
        var seriesName = undefined;
        var xValue = 0;
        var yValues = {};

        _.each(row, function (value, definition) {
          var name = definition.split("::")[0] || definition.split("__")[0];
          var type = definition.split("::")[1] || definition.split("__")[1];
          if (mapping) {
            type = mapping[definition];
          }

          if (type == 'unused') {
            return;
          }

          if (type == 'x') {
            xValue = value;
            point[type] = value;
          }
          if (type == 'y') {
            if (value == null) {
              value = 0;
            }
            yValues[name] = value;
            point[type] = value;
          }

          if (type == 'series') {
            seriesName = String(value);
          }

          if (type == 'multiFilter' || type == 'multi-filter') {
            seriesName = String(value);
          }
        });

        if (seriesName === undefined) {
          _.each(yValues, function (yValue, seriesName) {
            this._addPointToSeries({'x': xValue, 'y': yValue}, series, seriesName);
          }.bind(this));
        }
        else {
          this._addPointToSeries(point, series, seriesName);
        }
      }.bind(this));

      return _.values(series);
    };

    QueryResult.prototype.getColumns = function () {
      if (this.columns == undefined && this.query_result.data) {
        this.columns = this.query_result.data.columns;
      }

      return this.columns;
    }

    QueryResult.prototype.getColumnNames = function () {
      if (this.columnNames == undefined && this.query_result.data) {
        this.columnNames = _.map(this.query_result.data.columns, function (v) {
          return v.name;
        });
      }

      return this.columnNames;
    }

    QueryResult.prototype.getColumnNameWithoutType = function (column) {
      var typeSplit;
      if (column.indexOf("::") != -1) {
        typeSplit = "::";
      } else if (column.indexOf("__") != -1) {
        typeSplit = "__";
      } else {
        return column;
      }

      var parts = column.split(typeSplit);
      if (parts[0] == "" && parts.length == 2) {
        return parts[1];
      }
      return parts[0];
    };

    QueryResult.prototype.getColumnCleanName = function (column) {
      var name = this.getColumnNameWithoutType(column);

      return name;
    }

    QueryResult.prototype.getColumnFriendlyName = function (column) {
      return this.getColumnNameWithoutType(column).replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
      });
    }

    QueryResult.prototype.getColumnCleanNames = function () {
      return _.map(this.getColumnNames(), function (col) {
        return this.getColumnCleanName(col);
      }, this);
    }

    QueryResult.prototype.getColumnFriendlyNames = function () {
      return _.map(this.getColumnNames(), function (col) {
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
      var filterTypes = ['filter', 'multi-filter', 'multiFilter'];
      _.each(this.getColumns(), function (col) {
        var name = col.name;
        var type = name.split('::')[1] || name.split('__')[1];
        if (_.contains(filterTypes, type)) {
          // filter found
          var filter = {
            name: name,
            friendlyName: this.getColumnFriendlyName(name),
            column: col,
            values: [],
            multiple: (type=='multiFilter') || (type=='multi-filter')
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
        filter.values = _.uniq(filter.values, function(v) {
          if (moment.isMoment(v)) {
            return v.unix();
          } else {
            return v;
          }
        });
      });

      this.filters = filters;
    }

    var refreshStatus = function (queryResult, query) {
      Job.get({'id': queryResult.job.id}, function (response) {
        queryResult.update(response);

        if (queryResult.getStatus() == "processing" && queryResult.job.query_result_id && queryResult.job.query_result_id != "None") {
          QueryResultResource.get({'id': queryResult.job.query_result_id}, function (response) {
            queryResult.update(response);
          });
        } else if (queryResult.getStatus() != "failed") {
          $timeout(function () {
            refreshStatus(queryResult, query);
          }, 3000);
        }
      }, function(error) {
        console.log("Connection error", error);
        queryResult.update({job: {error: 'failed communicating with server. Please check your Internet connection and try again.', status: 4}})
      });
    }

    QueryResult.getById = function (id) {
      var queryResult = new QueryResult();

      QueryResultResource.get({'id': id}, function (response) {
        queryResult.update(response);
      });

      return queryResult;
    };

    QueryResult.prototype.toPromise = function() {
      return this.deferred.promise;
    }

    QueryResult.get = function (data_source_id, query, maxAge, queryId) {
      var queryResult = new QueryResult();

      var params = {'data_source_id': data_source_id, 'query': query, 'max_age': maxAge};
      if (queryId !== undefined) {
        params['query_id'] = queryId;
      };

      QueryResultResource.post(params, function (response) {
        queryResult.update(response);

        if ('job' in response) {
          refreshStatus(queryResult, query);
        }
      }, function(error) {
        if (error.status === 403) {
          queryResult.update(error.data);
        } else if (error.status === 400 && 'job' in error.data) {
          queryResult.update(error.data);
        } else {
          console.log("Unknown error", error);
          queryResult.update({job: {error: 'unknown error occurred. Please try again later.', status: 4}})
        }
      });

      return queryResult;
    }

    return QueryResult;
  };

  var Query = function ($resource, $location, QueryResult) {
    var Query = $resource('api/queries/:id', {id: '@id'},
      {
        search: {
          method: 'get',
          isArray: true,
          url: "api/queries/search"
        },
        recent: {
          method: 'get',
          isArray: true,
          url: "api/queries/recent"
        }
      });

    Query.newQuery = function () {
      return new Query({
        query: "",
        name: "New Query",
        schedule: null,
        user: currentUser,
        options: {}
      });
    };

    Query.prototype.getSourceLink = function () {
      return '/queries/' + this.id + '/source';
    };

    Query.prototype.isNew = function() {
      return this.id === undefined;
    };

    Query.prototype.hasDailySchedule = function() {
      return (this.schedule && this.schedule.match(/\d\d:\d\d/) !== null);
    };

    Query.prototype.scheduleInLocalTime = function() {
      var parts = this.schedule.split(':');
      return moment.utc().hour(parts[0]).minute(parts[1]).local().format('HH:mm');
    };

    Query.prototype.hasResult = function() {
      return !!(this.latest_query_data || this.latest_query_data_id);
    };

    Query.prototype.paramsRequired = function() {
      return this.getParameters().isRequired();
    };

    Query.prototype.getQueryResult = function (maxAge) {
      if (!this.query) {
        return;
      }
      var queryText = this.query;

      var parameters = this.getParameters();
      var missingParams = parameters.getMissing();

      if (missingParams.length > 0) {
        var paramsWord = "parameter";
        var valuesWord = "value";
        if (missingParams.length > 1) {
          paramsWord = "parameters";
          valuesWord = "values";
        }

        return new QueryResult({job: {error: "missing " + valuesWord + " for " + missingParams.join(', ')  + " "+paramsWord+".", status: 4}});
      }

      if (parameters.isRequired()) {
        queryText = Mustache.render(queryText, parameters.getValues());

        // Need to clear latest results, to make sure we don't use results for different params.
        this.latest_query_data = null;
        this.latest_query_data_id = null;
      }

      if (this.latest_query_data && maxAge != 0) {
        if (!this.queryResult) {
          this.queryResult = new QueryResult({'query_result': this.latest_query_data});
        }
      } else if (this.latest_query_data_id && maxAge != 0) {
        if (!this.queryResult) {
          this.queryResult = QueryResult.getById(this.latest_query_data_id);
        }
      } else if (this.data_source_id) {
        this.queryResult = QueryResult.get(this.data_source_id, queryText, maxAge, this.id);
      } else {
        return new QueryResultError("Please select data source to run this query.");
      }

      return this.queryResult;
    };

    Query.prototype.getUrl = function(source, hash) {
      var url = "queries/" + this.id;

      if (source) {
        url += '/source';
      }

      var params = "";
      if (this.getParameters().isRequired()) {
        _.each(this.getParameters().getValues(), function(value, name) {
          if (value === null) {
            return;
          }

          if (params !== "") {
            params += "&";
          }

          params += 'p_' + encodeURIComponent(name) + "=" + encodeURIComponent(value);
        });
      }

      if (params !== "") {
        url += "?" + params;
      }

      if (hash) {
        url += "#" + hash;
      }

      return url;
    }

    Query.prototype.getQueryResultPromise = function() {
      return this.getQueryResult().toPromise();
    };


    var Parameters = function(query) {
      this.query = query;

      this.parseQuery = function() {
        var parts = Mustache.parse(this.query.query);
        var parameters = [];
        var collectParams = function(parts) {
          parameters = [];
          _.each(parts, function(part) {
            if (part[0] == 'name' || part[0] == '&') {
              parameters.push(part[1]);
            } else if (part[0] == '#') {
              parameters = _.union(parameters, collectParams(part[4]));
            }
          });
          return parameters;
        };

        parameters = _.uniq(collectParams(parts));

        return parameters;
      }

      this.updateParameters = function() {
        if (this.query.query === this.cachedQueryText) {
          return;
        }

        this.cachedQueryText = this.query.query;
        var parameterNames = this.parseQuery();

        this.query.options.parameters = this.query.options.parameters || [];

        var parametersMap = {};
        _.each(this.query.options.parameters, function(param) {
          parametersMap[param.name] = param;
        });

        _.each(parameterNames, function(param) {
          if (!_.has(parametersMap, param)) {
            this.query.options.parameters.push({
              'title': param,
              'name': param,
              'type': 'text',
              'value': null
            });
          }
        }.bind(this));

        this.query.options.parameters = _.filter(this.query.options.parameters, function(p) { return _.indexOf(parameterNames, p.name) !== -1});
      }

      this.initFromQueryString = function() {
        var queryString = $location.search();
        _.each(this.get(), function(param) {
          var queryStringName = 'p_' + param.name;
          if (_.has(queryString, queryStringName)) {
            param.value = queryString[queryStringName];
          }
        });
      }

      this.updateParameters();
      this.initFromQueryString();
    }

    Parameters.prototype.get = function() {
      this.updateParameters();
      return this.query.options.parameters;
    };

    Parameters.prototype.getMissing = function() {
      return _.pluck(_.filter(this.get(), function(p) { return p.value === null || p.value === ''; }), 'title');
    }

    Parameters.prototype.isRequired = function() {
      return !_.isEmpty(this.get());
    }

    Parameters.prototype.getValues = function() {
      var params = this.get();
      return _.object(_.pluck(params, 'name'), _.pluck(params, 'value'));
    }

    Query.prototype.getParameters = function() {
      if (!this.$parameters) {
        this.$parameters = new Parameters(this);
      }

      return this.$parameters;
    }

    Query.prototype.getParametersDefs = function() {
      return this.getParameters().get();
    }

    return Query;
  };

  var DataSource = function ($resource) {
    var actions = {
      'get': {'method': 'GET', 'cache': false, 'isArray': false},
      'query': {'method': 'GET', 'cache': false, 'isArray': true},
      'getSchema': {'method': 'GET', 'cache': true, 'isArray': true, 'url': 'api/data_sources/:id/schema'}
    };

    var DataSourceResource = $resource('api/data_sources/:id', {id: '@id'}, actions);

    return DataSourceResource;
  };

  var Destination = function ($resource) {
    var actions = {
      'get': {'method': 'GET', 'cache': false, 'isArray': false},
      'query': {'method': 'GET', 'cache': false, 'isArray': true}
    };

    var DestinationResource = $resource('api/destinations/:id', {id: '@id'}, actions);

    return DestinationResource;
  };

  var User = function ($resource, $http) {
    var transformSingle = function(user) {
      if (user.groups !== undefined) {
        user.admin = user.groups.indexOf("admin") != -1;
      }
    };

    var transform = $http.defaults.transformResponse.concat(function(data, headers) {
      if (_.isArray(data)) {
        _.each(data, transformSingle);
      } else {
        transformSingle(data);
      }
      return data;
    });

    var actions = {
      'get': {method: 'GET', transformResponse: transform},
      'save': {method: 'POST', transformResponse: transform},
      'query': {method: 'GET', isArray: true, transformResponse: transform},
      'delete': {method: 'DELETE', transformResponse: transform}
    };

    var UserResource = $resource('api/users/:id', {id: '@id'}, actions);

    return UserResource;
  };

  var Group = function ($resource) {
    var actions = {
      'get': {'method': 'GET', 'cache': false, 'isArray': false},
      'query': {'method': 'GET', 'cache': false, 'isArray': true},
      'members': {'method': 'GET', 'cache': false, 'isArray': true, 'url': 'api/groups/:id/members'},
      'dataSources': {'method': 'GET', 'cache': false, 'isArray': true, 'url': 'api/groups/:id/data_sources'}
    };
    var resource = $resource('api/groups/:id', {id: '@id'}, actions);
    return resource;
  };

  var AlertSubscription = function ($resource) {
    var resource = $resource('api/alerts/:alertId/subscriptions/:subscriberId', {alertId: '@alert_id', subscriberId: '@id'});
    return resource;
  };

  var Alert = function ($resource, $http) {
    var actions = {
      save: {
        method: 'POST',
        transformRequest: [function(data) {
          var newData = _.extend({}, data);
          if (newData.query_id === undefined) {
            newData.query_id = newData.query.id;
            newData.destination_id = newData.destinations;
            delete newData.query;
            delete newData.destinations;
          }

          return newData;
        }].concat($http.defaults.transformRequest)
      }
    };
    var resource = $resource('api/alerts/:id', {id: '@id'}, actions);

    return resource;
  };

  var QuerySnippet = function ($resource) {
    var resource = $resource('api/query_snippets/:id', {id: '@id'});
    resource.prototype.getSnippet = function() {
      var name = this.trigger;
      if (this.description !== "") {
        name = this.trigger + ": " + this.description;
      }

      return {
        "name": name,
        "content": this.snippet,
        "tabTrigger": this.trigger
      };
    }
    
    return resource;
  };

  var Widget = function ($resource, Query) {
    var WidgetResource = $resource('api/widgets/:id', {id: '@id'});

    WidgetResource.prototype.getQuery = function () {
      if (!this.query && this.visualization) {
         this.query = new Query(this.visualization.query);
      }

      return this.query;
    };

    WidgetResource.prototype.getName = function () {
      if (this.visualization) {
        return this.visualization.query.name + ' (' + this.visualization.name + ')';
      }
      return _.str.truncate(this.text, 20);
    };

    return WidgetResource;
  }

  angular.module('redash.services')
      .factory('QueryResult', ['$resource', '$timeout', '$q', QueryResult])
      .factory('Query', ['$resource', '$location', 'QueryResult', Query])
      .factory('DataSource', ['$resource', DataSource])
      .factory('Destination', ['$resource', Destination])
      .factory('Alert', ['$resource', '$http', Alert])
      .factory('AlertSubscription', ['$resource', AlertSubscription])
      .factory('Widget', ['$resource', 'Query', Widget])
      .factory('User', ['$resource', '$http', User])
      .factory('Group', ['$resource', Group])
      .factory('QuerySnippet', ['$resource', QuerySnippet]);
})();
