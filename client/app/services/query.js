import moment from 'moment';
import Mustache from 'mustache';
import { each, object, isEmpty, pluck, filter, contains, union, uniq, has } from 'underscore';

function collectParams(parts) {
  let parameters = [];

  parts.forEach((part) => {
    if (part[0] === 'name' || part[0] === '&') {
      parameters.push(part[1]);
    } else if (part[0] === '#') {
      parameters = union(parameters, collectParams(part[4]));
    }
  });

  return parameters;
}

class QueryResultError {
  constructor(errorMessage) {
    this.errorMessage = errorMessage;
  }

  getError() {
    return this.errorMessage;
  }

  static getStatus() {
    return 'failed';
  }

  static getData() {
    return null;
  }

  static getLog() {
    return null;
  }

  static getChartData() {
    return null;
  }
}


class Parameter {
  constructor(parameter) {
    this.title = parameter.title;
    this.name = parameter.name;
    this.type = parameter.type;
    this.value = parameter.value;
    this.global = parameter.global;
    this.enumOptions = parameter.enumOptions;
    this.queryBasedOption = parameter.queryBasedOption;
  }

  get ngModel() {
    if (this.type === 'date' || this.type === 'datetime-local' || this.type === 'datetime-with-seconds') {
      this.$$value = this.$$value || moment(this.value).toDate();
      return this.$$value;
    } else if (this.type === 'number') {
      this.$$value = this.$$value || parseInt(this.value, 10);
      return this.$$value;
    }

    return this.value;
  }

  set ngModel(value) {
    if (value && this.type === 'date') {
      this.value = moment(value).format('YYYY-MM-DD');
      this.$$value = moment(this.value).toDate();
    } else if (value && this.type === 'datetime-local') {
      this.value = moment(value).format('YYYY-MM-DD HH:mm');
      this.$$value = moment(this.value).toDate();
    } else if (value && this.type === 'datetime-with-seconds') {
      this.value = moment(value).format('YYYY-MM-DD HH:mm:ss');
      this.$$value = moment(this.value).toDate();
    } else {
      this.value = this.$$value = value;
    }
  }
}

class Parameters {
  constructor(query, queryString) {
    this.query = query;
    this.updateParameters();
    this.initFromQueryString(queryString);
  }

  parseQuery() {
    const parts = Mustache.parse(this.query.query);
    const parameters = uniq(collectParams(parts));
    return parameters;
  }

  updateParameters() {
    if (this.query.query === this.cachedQueryText) {
      return;
    }

    this.cachedQueryText = this.query.query;
    const parameterNames = this.parseQuery();

    this.query.options.parameters = this.query.options.parameters || [];

    const parametersMap = {};
    this.query.options.parameters.forEach((param) => {
      parametersMap[param.name] = param;
    });

    parameterNames.forEach((param) => {
      if (!has(parametersMap, param)) {
        this.query.options.parameters.push({
          title: param,
          name: param,
          type: 'text',
          value: null,
          global: false,
        });
      }
    });

    const parameterExists = p => contains(parameterNames, p.name);
    this.query.options.parameters =
      this.query.options.parameters.filter(parameterExists).map(p => new Parameter(p));
  }

  initFromQueryString(queryString) {
    this.get().forEach((param) => {
      const queryStringName = `p_${param.name}`;
      if (has(queryString, queryStringName)) {
        param.value = queryString[queryStringName];
      }
    });
  }

  get() {
    this.updateParameters();
    return this.query.options.parameters;
  }

  getMissing() {
    return pluck(filter(this.get(), p => p.value === null || p.value === ''), 'title');
  }

  isRequired() {
    return !isEmpty(this.get());
  }

  getValues() {
    const params = this.get();
    return object(pluck(params, 'name'), pluck(params, 'value'));
  }
}

function QueryResource($resource, $http, $q, $location, currentUser, QueryResult) {
  const Query = $resource('api/queries/:id', { id: '@id' },
    {
      search: {
        method: 'get',
        isArray: true,
        url: 'api/queries/search',
      },
      recent: {
        method: 'get',
        isArray: true,
        url: 'api/queries/recent',
      },
      query: {
        isArray: false,
      },
      myQueries: {
        method: 'get',
        isArray: false,
        url: 'api/queries/my',
      },
      fork: {
        method: 'post',
        isArray: false,
        url: 'api/queries/:id/fork',
        params: { id: '@id' },
      },
      resultById: {
        method: 'get',
        isArray: false,
        url: 'api/queries/:id/results.json',
      },
    });

  Query.newQuery = function newQuery() {
    return new Query({
      query: '',
      name: 'New Query',
      schedule: null,
      user: currentUser,
      options: {},
    });
  };

  Query.format = function formatQuery(syntax, query) {
    if (syntax === 'json') {
      try {
        const formatted = JSON.stringify(JSON.parse(query), ' ', 4);
        return $q.resolve(formatted);
      } catch (err) {
        return $q.reject(String(err));
      }
    } else if (syntax === 'sql') {
      return $http.post('api/queries/format', { query }).then(response =>
         response.data.query
      );
    } else {
      return $q.reject('Query formatting is not supported for your data source syntax.');
    }
  };

  Query.prototype.getSourceLink = function getSourceLink() {
    return `/queries/${this.id}/source`;
  };

  Query.prototype.isNew = function isNew() {
    return this.id === undefined;
  };

  Query.prototype.hasDailySchedule = function hasDailySchedule() {
    return (this.schedule && this.schedule.match(/\d\d:\d\d/) !== null);
  };

  Query.prototype.scheduleInLocalTime = function scheduleInLocalTime() {
    const parts = this.schedule.split(':');
    return moment.utc()
                 .hour(parts[0])
                 .minute(parts[1])
                 .local()
                 .format('HH:mm');
  };

  Query.prototype.hasResult = function hasResult() {
    return !!(this.latest_query_data || this.latest_query_data_id);
  };

  Query.prototype.paramsRequired = function paramsRequired() {
    return this.getParameters().isRequired();
  };

  Query.prototype.getQueryResult = function getQueryResult(maxAge) {
    if (!this.query) {
      return new QueryResultError("Can't execute empty query.");
    }
    let queryText = this.query;

    const parameters = this.getParameters();
    const missingParams = parameters.getMissing();

    if (missingParams.length > 0) {
      let paramsWord = 'parameter';
      let valuesWord = 'value';
      if (missingParams.length > 1) {
        paramsWord = 'parameters';
        valuesWord = 'values';
      }

      return new QueryResult({ job: { error: `missing ${valuesWord} for ${missingParams.join(', ')} ${paramsWord}.`, status: 4 } });
    }

    if (parameters.isRequired()) {
      queryText = Mustache.render(queryText, parameters.getValues());

      // Need to clear latest results, to make sure we don't use results for different params.
      this.latest_query_data = null;
      this.latest_query_data_id = null;
    }

    if (this.latest_query_data && maxAge !== 0) {
      if (!this.queryResult) {
        this.queryResult = new QueryResult({ query_result: this.latest_query_data });
      }
    } else if (this.latest_query_data_id && maxAge !== 0) {
      if (!this.queryResult) {
        this.queryResult = QueryResult.getById(this.latest_query_data_id);
      }
    } else if (this.data_source_id) {
      this.queryResult = QueryResult.get(this.data_source_id, queryText, maxAge, this.id);
    } else {
      return new QueryResultError('Please select data source to run this query.');
    }

    return this.queryResult;
  };

  Query.prototype.getUrl = function getUrl(source, hash) {
    let url = `queries/${this.id}`;

    if (source) {
      url += '/source';
    }

    let params = '';
    if (this.getParameters().isRequired()) {
      each(this.getParameters().getValues(), (value, name) => {
        if (value === null) {
          return;
        }

        if (params !== '') {
          params += '&';
        }

        params += `p_${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      });
    }

    if (params !== '') {
      url += `?${params}`;
    }

    if (hash) {
      url += `#${hash}`;
    }

    return url;
  };

  Query.prototype.getQueryResultPromise = function getQueryResultPromise() {
    return this.getQueryResult().toPromise();
  };

  Query.prototype.getParameters = function getParameters() {
    if (!this.$parameters) {
      this.$parameters = new Parameters(this, $location.search());
    }

    return this.$parameters;
  };

  Query.prototype.getParametersDefs = function getParametersDefs() {
    return this.getParameters().get();
  };

  return Query;
}

export default function (ngModule) {
  ngModule.factory('Query', QueryResource);
}
