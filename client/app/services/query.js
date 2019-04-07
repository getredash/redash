import moment from 'moment';
import debug from 'debug';
import Mustache from 'mustache';
import {
  zipObject, isEmpty, map, filter, includes, union, uniq, has,
  isNull, isUndefined, isArray, isObject, identity, extend, each,
} from 'lodash';

Mustache.escape = identity; // do not html-escape values

export let Query = null; // eslint-disable-line import/no-mutable-exports

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

export class Parameter {
  constructor(parameter, parentQueryId) {
    this.title = parameter.title;
    this.name = parameter.name;
    this.type = parameter.type;
    this.useCurrentDateTime = parameter.useCurrentDateTime;
    this.global = parameter.global; // backward compatibility in Widget service
    this.enumOptions = parameter.enumOptions;
    this.queryId = parameter.queryId;
    this.parentQueryId = parentQueryId;

    // Used for meta-parameters (i.e. dashboard-level params)
    this.locals = [];

    // validate value and init internal state
    this.setValue(parameter.value);

    // Used for URL serialization
    Object.defineProperty(this, 'urlPrefix', {
      configurable: true,
      enumerable: false, // don't save it
      writable: true,
      value: 'p_',
    });
  }

  clone() {
    return new Parameter(this, this.parentQueryId);
  }

  get isEmpty() {
    return isNull(this.getValue());
  }

  getValue() {
    return this.constructor.getValue(this);
  }

  static getValue(param) {
    const { value, type, useCurrentDateTime } = param;
    const isEmptyValue = isNull(value) || isUndefined(value) || (value === '');
    if (isEmptyValue) {
      if (
        includes(['date', 'datetime-local', 'datetime-with-seconds'], type) &&
        useCurrentDateTime
      ) {
        return moment().format(DATETIME_FORMATS[type]);
      }
      return null; // normalize empty value
    }
    if (type === 'number') {
      return normalizeNumericValue(value, null); // normalize empty value
    }
    return value;
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

    if (isArray(this.locals)) {
      each(this.locals, (local) => {
        local.setValue(this.value);
      });
    }

    return this;
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
    const prefix = this.urlPrefix;
    if (isDateRangeParameter(this.type)) {
      return {
        [`${prefix}${this.name}.start`]: this.value.start,
        [`${prefix}${this.name}.end`]: this.value.end,
      };
    }
    return {
      [`${prefix}${this.name}`]: this.value,
    };
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    if (isDateRangeParameter(this.type)) {
      const keyStart = `${prefix}${this.name}.start`;
      const keyEnd = `${prefix}${this.name}.end`;
      if (has(query, keyStart) && has(query, keyEnd)) {
        this.setValue([query[keyStart], query[keyEnd]]);
      }
    } else {
      const key = `${prefix}${this.name}`;
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

  loadDropdownValues() {
    if (this.parentQueryId) {
      return Query.associatedDropdown({ queryId: this.parentQueryId, dropdownQueryId: this.queryId }).$promise;
    }

    return Query.asDropdown({ id: this.queryId }).$promise;
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
    const parameters = this.query.options.parameters;
    this.query.options.parameters = parameters.filter(parameterExists).map(p => new Parameter(p, this.query.id));
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

  toUrlParams() {
    if (this.get().length === 0) {
      return '';
    }

    const params = Object.assign(...this.get().map(p => p.toUrlParams()));
    return Object
      .keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join('&');
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
  const QueryService = $resource(
    'api/queries/:id',
    { id: '@id' },
    {
      recent: {
        method: 'get',
        isArray: true,
        url: 'api/queries/recent',
      },
      archive: {
        method: 'get',
        isArray: false,
        url: 'api/queries/archive',
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
      asDropdown: {
        method: 'get',
        isArray: true,
        url: 'api/queries/:id/dropdown',
      },
      associatedDropdown: {
        method: 'get',
        isArray: true,
        url: 'api/queries/:queryId/dropdowns/:dropdownQueryId',
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

  QueryService.newQuery = function newQuery() {
    return new QueryService({
      query: '',
      name: 'New Query',
      schedule: null,
      user: currentUser,
      options: {},
    });
  };

  QueryService.format = function formatQuery(syntax, query) {
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

  QueryService.prototype.getSourceLink = function getSourceLink() {
    return `/queries/${this.id}/source`;
  };

  QueryService.prototype.isNew = function isNew() {
    return this.id === undefined;
  };

  QueryService.prototype.hasDailySchedule = function hasDailySchedule() {
    return this.schedule && this.schedule.match(/\d\d:\d\d/) !== null;
  };

  QueryService.prototype.scheduleInLocalTime = function scheduleInLocalTime() {
    const parts = this.schedule.split(':');
    return moment
      .utc()
      .hour(parts[0])
      .minute(parts[1])
      .local()
      .format('HH:mm');
  };

  QueryService.prototype.hasResult = function hasResult() {
    return !!(this.latest_query_data || this.latest_query_data_id);
  };

  QueryService.prototype.paramsRequired = function paramsRequired() {
    return this.getParameters().isRequired();
  };

  QueryService.prototype.prepareQueryResultExecution = function prepareQueryResultExecution(execute, maxAge) {
    if (!this.query) {
      return new QueryResultError("Can't execute empty query.");
    }

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
      this.queryResult = execute();
    } else {
      return new QueryResultError('Please select data source to run this query.');
    }

    return this.queryResult;
  };

  QueryService.prototype.getQueryResult = function getQueryResult(maxAge) {
    const execute = () => QueryResult.getByQueryId(this.id, this.getParameters().getValues(), maxAge);
    return this.prepareQueryResultExecution(execute, maxAge);
  };

  QueryService.prototype.getQueryResultByText = function getQueryResultByText(maxAge, selectedQueryText) {
    const queryText = selectedQueryText || this.query;
    const parameters = this.getParameters().getValues();
    const execute = () => QueryResult.get(this.data_source_id, queryText, parameters, maxAge, this.id);
    return this.prepareQueryResultExecution(execute, maxAge);
  };

  QueryService.prototype.getUrl = function getUrl(source, hash) {
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

  QueryService.prototype.getQueryResultPromise = function getQueryResultPromise() {
    return this.getQueryResult().toPromise();
  };

  QueryService.prototype.getParameters = function getParameters() {
    if (!this.$parameters) {
      this.$parameters = new Parameters(this, $location.search());
    }

    return this.$parameters;
  };

  QueryService.prototype.getParametersDefs = function getParametersDefs() {
    return this.getParameters().get();
  };

  return QueryService;
}

export default function init(ngModule) {
  ngModule.factory('QueryResultError', QueryResultErrorFactory);
  ngModule.factory('Query', QueryResource);

  ngModule.run(($injector) => {
    Query = $injector.get('Query');
  });
}

init.init = true;
