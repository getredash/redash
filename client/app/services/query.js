import moment from 'moment';
import debug from 'debug';
import Mustache from 'mustache';
import {
  zipObject, isEmpty, map, filter, includes, union, uniq, has, get, intersection,
  isNull, isUndefined, isArray, isObject, identity, extend, each, join, some, startsWith,
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

const DYNAMIC_PREFIX = 'd_';

const DYNAMIC_DATE_RANGES = {
  today: {
    name: 'Today',
    value: () => [moment().startOf('day'), moment().endOf('day')],
  },
  yesterday: {
    name: 'Yesterday',
    value: () => [moment().subtract(1, 'day').startOf('day'), moment().subtract(1, 'day').endOf('day')],
  },
  this_week: {
    name: 'This week',
    value: () => [moment().startOf('week'), moment().endOf('week')],
  },
  this_month: {
    name: 'This month',
    value: () => [moment().startOf('month'), moment().endOf('month')],
  },
  this_year: {
    name: 'This year',
    value: () => [moment().startOf('year'), moment().endOf('year')],
  },
  last_week: {
    name: 'Last week',
    value: () => [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
  },
  last_month: {
    name: 'Last month',
    value: () => [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
  },
  last_year: {
    name: 'Last year',
    value: () => [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
  },
  last_7_days: {
    name: 'Last 7 days',
    value: () => [moment().subtract(7, 'days'), moment()],
  },
};

const DYNAMIC_DATES = {
  now: {
    name: 'Today/Now',
    value: () => moment(),
  },
  yesterday: {
    name: 'Yesterday',
    value: () => moment().subtract(1, 'day'),
  },
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

function isEmptyValue(value) {
  return isNull(value) || isUndefined(value) || (value === '') || (isArray(value) && value.length === 0);
}

function isDateParameter(paramType) {
  return includes(['date', 'datetime-local', 'datetime-with-seconds'], paramType);
}

function isDateRangeParameter(paramType) {
  return includes(['date-range', 'datetime-range', 'datetime-range-with-seconds'], paramType);
}

export function isDynamicDate(value) {
  if (!startsWith(value, DYNAMIC_PREFIX)) {
    return false;
  }
  return !!DYNAMIC_DATES[value.substring(DYNAMIC_PREFIX.length)];
}

export function isDynamicDateRange(value) {
  if (!startsWith(value, DYNAMIC_PREFIX)) {
    return false;
  }
  return !!DYNAMIC_DATE_RANGES[value.substring(DYNAMIC_PREFIX.length)];
}

export function getDynamicDate(value) {
  if (!isDynamicDate(value)) {
    return null;
  }
  return DYNAMIC_DATES[value.substring(DYNAMIC_PREFIX.length)];
}

export function getDynamicDateRange(value) {
  if (!isDynamicDateRange(value)) {
    return null;
  }
  return DYNAMIC_DATE_RANGES[value.substring(DYNAMIC_PREFIX.length)];
}

export class Parameter {
  constructor(parameter, parentQueryId) {
    this.title = parameter.title;
    this.name = parameter.name;
    this.type = parameter.type;
    this.useCurrentDateTime = parameter.useCurrentDateTime;
    this.global = parameter.global; // backward compatibility in Widget service
    this.enumOptions = parameter.enumOptions;
    this.multiValuesOptions = parameter.multiValuesOptions;
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

  get hasDynamicValue() {
    if (isDateParameter(this.type)) {
      return isDynamicDate(this.value);
    }
    if (isDateRangeParameter(this.type)) {
      return isDynamicDateRange(this.value);
    }
    return false;
  }

  get dynamicValue() {
    if (isDateParameter(this.type)) {
      return getDynamicDate(this.value);
    }
    if (isDateRangeParameter(this.type)) {
      return getDynamicDateRange(this.value);
    }
    return false;
  }

  getValue(extra = {}) {
    return this.constructor.getValue(this, extra);
  }

  static getValue(param, extra = {}) {
    const { value, type, useCurrentDateTime, multiValuesOptions } = param;
    if (isDateRangeParameter(type) && param.hasDynamicValue) {
      const { dynamicValue } = param;
      if (dynamicValue) {
        const dateRange = dynamicValue.value();
        return {
          start: dateRange[0].format(DATETIME_FORMATS[type]),
          end: dateRange[1].format(DATETIME_FORMATS[type]),
        };
      }
      return null;
    }

    if (isDateParameter(type) && param.hasDynamicValue) {
      const { dynamicValue } = param;
      if (dynamicValue) {
        return dynamicValue.value().format(DATETIME_FORMATS[type]);
      }
      return null;
    }

    if (isEmptyValue(value)) {
      // keep support for existing useCurentDateTime (not available in UI)
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

    // join array in frontend when query is executed as a text
    const { joinListValues } = extra;
    if (includes(['enum', 'query'], type) && multiValuesOptions && isArray(value) && joinListValues) {
      const separator = get(multiValuesOptions, 'separator', ',');
      const prefix = get(multiValuesOptions, 'prefix', '');
      const suffix = get(multiValuesOptions, 'suffix', '');
      const parameterValues = map(value, v => `${prefix}${v}${suffix}`);
      return join(parameterValues, separator);
    }
    return value;
  }

  setValue(value) {
    if (this.type === 'enum') {
      const enumOptionsArray = this.enumOptions && this.enumOptions.split('\n') || [];
      if (this.multiValuesOptions) {
        if (!isArray(value)) {
          value = [value];
        }
        value = intersection(value, enumOptionsArray);
      } else if (!value || isArray(value) || !includes(enumOptionsArray, value)) {
        value = enumOptionsArray[0];
      }
    }

    if (this.type === 'query' && !isEmptyValue(value)) {
      if (this.multiValuesOptions && !isArray(value)) {
        value = [value];
      }
    }

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
      } else if (isDynamicDateRange(value)) {
        const dynamicDateRange = getDynamicDateRange(value, this.type);
        if (dynamicDateRange) {
          this.value = value;
          this.$$value = value;
        }
      }
    } else if (isDateParameter(this.type)) {
      this.value = null;
      this.$$value = null;

      if (isDynamicDate(value)) {
        const dynamicDate = getDynamicDate(value);
        if (dynamicDate) {
          this.value = value;
          this.$$value = value;
        }
      } else {
        value = moment(value);
        if (value.isValid()) {
          this.value = value.format(DATETIME_FORMATS[this.type]);
          this.$$value = value;
        }
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

    this.clearPendingValue();

    return this;
  }

  setPendingValue(value) {
    this.pendingValue = value;
  }

  applyPendingValue() {
    if (this.hasPendingValue) {
      this.setValue(this.pendingValue);
    }
  }

  clearPendingValue() {
    this.setPendingValue(undefined);
  }

  get hasPendingValue() {
    // normalize empty values
    const pendingValue = isEmptyValue(this.pendingValue) ? null : this.pendingValue;
    const value = isEmptyValue(this.value) ? null : this.value;

    return this.pendingValue !== undefined && pendingValue !== value;
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
    const prefix = this.urlPrefix;
    if (this.isEmpty) {
      return { [`${prefix}${this.name}`]: null };
    }

    if (isDateRangeParameter(this.type) && isObject(this.value)) {
      return {
        [`${prefix}${this.name}.start`]: this.value.start,
        [`${prefix}${this.name}.end`]: this.value.end,
        [`${prefix}${this.name}`]: null,
      };
    }
    if (this.multiValuesOptions && isArray(this.value)) {
      return { [`${prefix}${this.name}`]: JSON.stringify(this.value) };
    }
    return {
      [`${prefix}${this.name}`]: this.value,
      [`${prefix}${this.name}.start`]: null,
      [`${prefix}${this.name}.end`]: null,
    };
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    if (isDateRangeParameter(this.type)) {
      const key = `${prefix}${this.name}`;
      const keyStart = `${prefix}${this.name}.start`;
      const keyEnd = `${prefix}${this.name}.end`;
      if (has(query, key)) {
        this.setValue(query[key]);
      } else if (has(query, keyStart) && has(query, keyEnd)) {
        this.setValue([query[keyStart], query[keyEnd]]);
      }
    } else {
      const key = `${prefix}${this.name}`;
      if (has(query, key)) {
        if (this.multiValuesOptions) {
          try {
            const valueFromJson = JSON.parse(query[key]);
            this.setValue(isArray(valueFromJson) ? valueFromJson : query[key]);
          } catch (e) {
            this.setValue(query[key]);
          }
        } else {
          this.setValue(query[key]);
        }
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
    const fallback = () => map(this.query.options.parameters, i => i.name);

    let parameters = [];
    if (this.query.query !== undefined) {
      try {
        const parts = Mustache.parse(this.query.query);
        parameters = uniq(collectParams(parts));
      } catch (e) {
        logger('Failed parsing parameters: ', e);
        // Return current parameters so we don't reset the list
        parameters = fallback();
      }
    } else {
      parameters = fallback();
    }

    return parameters;
  }

  updateParameters(update) {
    if (this.query.query && this.query.query === this.cachedQueryText) {
      return;
    }

    this.cachedQueryText = this.query.query;
    const parameterNames = update ? this.parseQuery() : map(this.query.options.parameters, p => p.name);

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
    this.query.options.parameters = parameters.filter(parameterExists)
      .map(p => (p instanceof Parameter ? p : new Parameter(p, this.query.id)));
  }

  initFromQueryString(query) {
    this.get().forEach((param) => {
      param.fromUrlParams(query);
    });
  }

  get(update = true) {
    this.updateParameters(update);
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

  getValues(extra = {}) {
    const params = this.get();
    return zipObject(map(params, i => i.name), map(params, i => i.getValue(extra)));
  }

  hasPendingValues() {
    return some(this.get(), p => p.hasPendingValue);
  }

  applyPendingValues() {
    each(this.get(), p => p.applyPendingValue());
  }

  toUrlParams() {
    if (this.get().length === 0) {
      return '';
    }

    const params = Object.assign(...this.get().map(p => p.toUrlParams()));
    Object.keys(params).forEach(key => params[key] == null && delete params[key]);
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

  QueryService.prototype.hasParameters = function hasParameters() {
    return this.getParametersDefs().length > 0;
  };

  QueryService.prototype.prepareQueryResultExecution = function prepareQueryResultExecution(execute, maxAge) {
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
        this.queryResult = QueryResult.getById(this.id, this.latest_query_data_id);
      }
    } else {
      this.queryResult = execute();
    }

    return this.queryResult;
  };

  QueryService.prototype.getQueryResult = function getQueryResult(maxAge) {
    const execute = () => QueryResult.getByQueryId(this.id, this.getParameters().getValues(), maxAge);
    return this.prepareQueryResultExecution(execute, maxAge);
  };

  QueryService.prototype.getQueryResultByText = function getQueryResultByText(maxAge, selectedQueryText) {
    const queryText = selectedQueryText || this.query;
    if (!queryText) {
      return new QueryResultError("Can't execute empty query.");
    }

    const parameters = this.getParameters().getValues({ joinListValues: true });
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
    Object.keys(params).forEach(key => params[key] == null && delete params[key]);
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

  QueryService.prototype.getParametersDefs = function getParametersDefs(update = true) {
    return this.getParameters().get(update);
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
