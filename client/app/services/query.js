import moment from 'moment';
import debug from 'debug';
import Mustache from 'mustache';
import {
  zipObject, isEmpty, map, filter, includes, union, uniq, has,
  isNull, isUndefined, isArray, isObject, identity, extend,
} from 'lodash';

Mustache.escape = identity; // do not html-escape values

const logger = debug('redash:services:query');

const DATETIME_FORMATS = {
  // eslint-disable-next-line quote-props
  'date': 'YYYY-MM-DD',
  'date-range': 'YYYY-MM-DD',
  'datetime-local': 'YYYY-MM-DD HH:mm',
  'datetime-range': 'YYYY-MM-DD HH:mm',
  'datetime-with-seconds': 'YYYY-MM-DD HH:mm:ss',
  'datetime-range-with-seconds': 'YYYY-MM-DD HH:mm:ss',
};

function normalizeNumericValue(value, defaultValue = null) {
  const result = parseFloat(value);
  return isFinite(result) ? result : defaultValue;
}

function collectParams(parts) {
  let parameters = [];

  parts.forEach((part) => {
    if (part[0] === 'name' || part[0] === '&') {
      parameters.push(part[1].split('.')[0]);
    } else if (part[0] === '#') {
      parameters = union(parameters, collectParams(part[4]));
    }
  });

  return parameters;
}

function isDateParameter(paramType) {
  return includes(['date', 'datetime-local', 'datetime-with-seconds'], paramType);
}

function isDateRangeParameter(paramType) {
  return includes(['date-range', 'datetime-range', 'datetime-range-with-seconds'], paramType);
}

class Parameter {
  constructor(parameter) {
    this.title = parameter.title;
    this.name = parameter.name;
    this.type = parameter.type;
    this.useCurrentDateTime = parameter.useCurrentDateTime;
    this.global = parameter.global;
    this.enumOptions = parameter.enumOptions;
    this.queryId = parameter.queryId;

    // validate value and init internal state
    this.setValue(parameter.value);
  }

  clone() {
    return new Parameter(this);
  }

  get isEmpty() {
    return isNull(this.getValue());
  }

  getValue() {
    const isEmptyValue = isNull(this.value) || isUndefined(this.value) || (this.value === '');
    if (isEmptyValue) {
      if (
        includes(['date', 'datetime-local', 'datetime-with-seconds'], this.type) &&
        this.useCurrentDateTime
      ) {
        return moment().format(DATETIME_FORMATS[this.type]);
      }
      return null; // normalize empty value
    }
    if (this.type === 'number') {
      return normalizeNumericValue(this.value, null); // normalize empty value
    }
    return this.value;
  }

  setValue(value) {
    if (isDateRangeParameter(this.type)) {
      this.value = null;
      this.$$value = null;

      if (isObject(value) && !isArray(value)) {
        value = [value.start, value.end];
      }

      if (isArray(value) && (value.length === 2)) {
        value = [moment(value[0]), moment(value[1])];
        if (value[0].isValid() && value[1].isValid()) {
          this.value = {
            start: value[0].format(DATETIME_FORMATS[this.type]),
            end: value[1].format(DATETIME_FORMATS[this.type]),
          };
          this.$$value = value;
        }
      }
    } else if (isDateParameter(this.type)) {
      this.value = null;
      this.$$value = null;

      value = moment(value);
      if (value.isValid()) {
        this.value = value.format(DATETIME_FORMATS[this.type]);
        this.$$value = value;
      }
    } else if (this.type === 'number') {
      this.value = value;
      this.$$value = normalizeNumericValue(value, null);
    } else {
      this.value = value;
      this.$$value = value;
    }
  }

  get normalizedValue() {
    return this.$$value;
  }

  // TODO: Remove this property when finally moved to React
  get ngModel() {
    return this.normalizedValue;
  }
  set ngModel(value) {
    this.setValue(value);
  }

  toUrlParams() {
    if (this.isEmpty) {
      return {};
    }
    if (isDateRangeParameter(this.type)) {
      return {
        [`p_${this.name}.start`]: this.value.start,
        [`p_${this.name}.end`]: this.value.end,
      };
    }
    return {
      [`p_${this.name}`]: this.value,
    };
  }

  fromUrlParams(query) {
    if (isDateRangeParameter(this.type)) {
      const keyStart = `p_${this.name}.start`;
      const keyEnd = `p_${this.name}.end`;
      if (has(query, keyStart) && has(query, keyEnd)) {
        this.setValue([query[keyStart], query[keyEnd]]);
      }
    } else {
      const key = `p_${this.name}`;
      if (has(query, key)) {
        this.setValue(query[key]);
      }
    }
  }

  toQueryTextFragment() {
    if (isDateRangeParameter(this.type)) {
      return `{{ ${this.name}.start }} {{ ${this.name}.end }}`;
    }
    return `{{ ${this.name} }}`;
  }
}

class Parameters {
  constructor(query, queryString) {
    this.query = query;
    this.updateParameters();
    this.initFromQueryString(queryString);
  }

  parseQuery() {
    let parameters = [];
    try {
      const parts = Mustache.parse(this.query.query);
      parameters = uniq(collectParams(parts));
    } catch (e) {
      logger('Failed parsing parameters: ', e);
      // Return current parameters so we don't reset the list
      parameters = map(this.query.options.parameters, i => i.name);
    }
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
        this.query.options.parameters.push(new Parameter({
          title: param,
          name: param,
          type: 'text',
          value: null,
          global: false,
        }));
      }
    });

    const parameterExists = p => includes(parameterNames, p.name);
    this.query.options.parameters = this.query.options.parameters.filter(parameterExists).map(p => new Parameter(p));
  }

  initFromQueryString(query) {
    this.get().forEach((param) => {
      param.fromUrlParams(query);
    });
  }

  get() {
    this.updateParameters();
    return this.query.options.parameters;
  }

  add(parameterDef) {
    this.query.options.parameters = this.query.options.parameters
      .filter(p => p.name !== parameterDef.name);
    const param = new Parameter(parameterDef);
    this.query.options.parameters.push(param);
    return param;
  }

  getMissing() {
    return map(filter(this.get(), p => p.isEmpty), i => i.title);
  }

  isRequired() {
    return !isEmpty(this.get());
  }

  getValues() {
    const params = this.get();
    return zipObject(map(params, i => i.name), map(params, i => i.getValue()));
  }
}

function QueryResultErrorFactory($q) {
  class QueryResultError {
    constructor(errorMessage) {
      this.errorMessage = errorMessage;
      this.updatedAt = moment.utc();
    }

    getUpdatedAt() {
      return this.updatedAt;
    }

    getError() {
      return this.errorMessage;
    }

    toPromise() {
      return $q.reject(this);
    }

    // eslint-disable-next-line class-methods-use-this
    getStatus() {
      return 'failed';
    }

    // eslint-disable-next-line class-methods-use-this
    getData() {
      return null;
    }

    // eslint-disable-next-line class-methods-use-this
    getLog() {
      return null;
    }

    // eslint-disable-next-line class-methods-use-this
    getChartData() {
      return null;
    }
  }

  return QueryResultError;
}

function QueryResource(
  $resource,
  $http,
  $location,
  $q,
  currentUser,
  QueryResultError,
  QueryResult,
) {
  const Query = $resource(
    'api/queries/:id',
    { id: '@id' },
    {
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
      favorites: {
        method: 'get',
        isArray: false,
        url: 'api/queries/favorites',
      },
      favorite: {
        method: 'post',
        isArray: false,
        url: 'api/queries/:id/favorite',
        transformRequest: [() => ''], // body not needed
      },
      unfavorite: {
        method: 'delete',
        isArray: false,
        url: 'api/queries/:id/favorite',
        transformRequest: [() => ''], // body not needed
      },
    },
  );

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
      return $http.post('api/queries/format', { query }).then(response => response.data.query);
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
    return this.schedule && this.schedule.match(/\d\d:\d\d/) !== null;
  };

  Query.prototype.scheduleInLocalTime = function scheduleInLocalTime() {
    const parts = this.schedule.split(':');
    return moment
      .utc()
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
    const queryText = this.query;

    const parameters = this.getParameters();
    const missingParams = parameters.getMissing();

    if (missingParams.length > 0) {
      let paramsWord = 'parameter';
      let valuesWord = 'value';
      if (missingParams.length > 1) {
        paramsWord = 'parameters';
        valuesWord = 'values';
      }

      return new QueryResult({
        job: {
          error: `missing ${valuesWord} for ${missingParams.join(', ')} ${paramsWord}.`,
          status: 4,
        },
      });
    }

    if (parameters.isRequired()) {
      // Need to clear latest results, to make sure we don't use results for different params.
      this.latest_query_data = null;
      this.latest_query_data_id = null;
    }

    if (this.latest_query_data && maxAge !== 0) {
      if (!this.queryResult) {
        this.queryResult = new QueryResult({
          query_result: this.latest_query_data,
        });
      }
    } else if (this.latest_query_data_id && maxAge !== 0) {
      if (!this.queryResult) {
        this.queryResult = QueryResult.getById(this.latest_query_data_id);
      }
    } else if (this.data_source_id) {
      this.queryResult = QueryResult.get(this.data_source_id, queryText, parameters.getValues(), maxAge, this.id);
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

    let params = {};
    if (this.getParameters().isRequired()) {
      this.getParametersDefs().forEach((param) => {
        extend(params, param.toUrlParams());
      });
    }
    params = map(params, (value, name) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&');

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

export default function init(ngModule) {
  ngModule.factory('QueryResultError', QueryResultErrorFactory);
  ngModule.factory('Query', QueryResource);
}

init.init = true;

