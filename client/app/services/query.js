import moment from "moment";
import debug from "debug";
import Mustache from "mustache";
import { axios } from "@/services/axios";
import {
  zipObject,
  isEmpty,
  isArray,
  map,
  filter,
  includes,
  union,
  uniq,
  has,
  identity,
  extend,
  each,
  some,
  clone,
  find,
} from "lodash";
import location from "@/services/location";

import { Parameter, createParameter } from "./parameters";
import { currentUser } from "./auth";
import QueryResult from "./query-result";
import localOptions from "@/lib/localOptions";

Mustache.escape = identity; // do not html-escape values

const logger = debug("redash:services:query");

function collectParams(parts) {
  let parameters = [];

  parts.forEach(part => {
    if (part[0] === "name" || part[0] === "&") {
      parameters.push(part[1].split(".")[0]);
    } else if (part[0] === "#") {
      parameters = union(parameters, collectParams(part[4]));
    }
  });

  return parameters;
}

export class Query {
  constructor(query) {
    extend(this, query);

    if (!has(this, "options")) {
      this.options = {};
    }
    this.options.apply_auto_limit = !!this.options.apply_auto_limit;

    if (!isArray(this.options.parameters)) {
      this.options.parameters = [];
    }
  }

  isNew() {
    return this.id === undefined;
  }

  hasDailySchedule() {
    return this.schedule && this.schedule.match(/\d\d:\d\d/) !== null;
  }

  scheduleInLocalTime() {
    const parts = this.schedule.split(":");
    return moment
      .utc()
      .hour(parts[0])
      .minute(parts[1])
      .local()
      .format("HH:mm");
  }

  hasResult() {
    return !!(this.latest_query_data || this.latest_query_data_id);
  }

  paramsRequired() {
    return this.getParameters().isRequired();
  }

  hasParameters() {
    return this.getParametersDefs().length > 0;
  }

  prepareQueryResultExecution(execute, maxAge) {
    const parameters = this.getParameters();
    const missingParams = parameters.getMissing();

    if (missingParams.length > 0) {
      let paramsWord = "parameter";
      let valuesWord = "value";
      if (missingParams.length > 1) {
        paramsWord = "parameters";
        valuesWord = "values";
      }

      return new QueryResult({
        job: {
          error: `missing ${valuesWord} for ${missingParams.join(", ")} ${paramsWord}.`,
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
  }

  getQueryResult(maxAge) {
    const execute = () =>
      QueryResult.getByQueryId(this.id, this.getParameters().getExecutionValues(), this.getAutoLimit(), maxAge);
    return this.prepareQueryResultExecution(execute, maxAge);
  }

  getQueryResultByText(maxAge, selectedQueryText) {
    const queryText = selectedQueryText || this.query;
    if (!queryText) {
      return new QueryResultError("Can't execute empty query.");
    }

    const parameters = this.getParameters().getExecutionValues({ joinListValues: true });
    const execute = () =>
      QueryResult.get(this.data_source_id, queryText, parameters, this.getAutoLimit(), maxAge, this.id);
    return this.prepareQueryResultExecution(execute, maxAge);
  }

  getUrl(source, hash) {
    let url = `queries/${this.id}`;

    if (source) {
      url += "/source";
    }

    let params = {};
    if (this.getParameters().isRequired()) {
      this.getParametersDefs().forEach(param => {
        extend(params, param.toUrlParams());
      });
    }
    Object.keys(params).forEach(key => params[key] == null && delete params[key]);
    params = map(params, (value, name) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&");

    if (params !== "") {
      url += `?${params}`;
    }

    if (hash) {
      url += `#${hash}`;
    }

    return url;
  }

  getQueryResultPromise() {
    return this.getQueryResult().toPromise();
  }

  getParameters() {
    if (!this.$parameters) {
      this.$parameters = new Parameters(this, location.search);
    }

    return this.$parameters;
  }

  getAutoLimit() {
    return this.options.apply_auto_limit;
  }

  getParametersDefs(update = true) {
    return this.getParameters().get(update);
  }

  favorite() {
    return Query.favorite(this);
  }

  unfavorite() {
    return Query.unfavorite(this);
  }

  clone() {
    const newQuery = clone(this);
    newQuery.$parameters = null;
    newQuery.getParameters();
    return newQuery;
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
        logger("Failed parsing parameters: ", e);
        // Return current parameters so we don't reset the list
        parameters = fallback();
      }
    } else {
      parameters = fallback();
    }

    return parameters;
  }

  updateParameters(update) {
    if (this.query.query === this.cachedQueryText) {
      const parameters = this.query.options.parameters;
      const hasUnprocessedParameters = find(parameters, p => !(p instanceof Parameter));
      if (hasUnprocessedParameters) {
        this.query.options.parameters = map(parameters, p =>
          p instanceof Parameter ? p : createParameter(p, this.query.id)
        );
      }
      return;
    }

    this.cachedQueryText = this.query.query;
    const parameterNames = update ? this.parseQuery() : map(this.query.options.parameters, p => p.name);

    this.query.options.parameters = this.query.options.parameters || [];

    const parametersMap = {};
    this.query.options.parameters.forEach(param => {
      parametersMap[param.name] = param;
    });

    parameterNames.forEach(param => {
      if (!has(parametersMap, param)) {
        this.query.options.parameters.push(
          createParameter({
            title: param,
            name: param,
            type: "text",
            value: null,
            global: false,
          })
        );
      }
    });

    const parameterExists = p => includes(parameterNames, p.name);
    const parameters = this.query.options.parameters;
    this.query.options.parameters = parameters
      .filter(parameterExists)
      .map(p => (p instanceof Parameter ? p : createParameter(p, this.query.id)));
  }

  initFromQueryString(query) {
    this.get().forEach(param => {
      param.fromUrlParams(query);
    });
  }

  get(update = true) {
    this.updateParameters(update);
    return this.query.options.parameters;
  }

  add(parameterDef) {
    this.query.options.parameters = this.query.options.parameters.filter(p => p.name !== parameterDef.name);
    const param = createParameter(parameterDef);
    this.query.options.parameters.push(param);
    return param;
  }

  getMissing() {
    return map(
      filter(this.get(), p => p.isEmpty),
      i => i.title
    );
  }

  isRequired() {
    return !isEmpty(this.get());
  }

  getExecutionValues(extra = {}) {
    const params = this.get();
    return zipObject(
      map(params, i => i.name),
      map(params, i => i.getExecutionValue(extra))
    );
  }

  hasPendingValues() {
    return some(this.get(), p => p.hasPendingValue);
  }

  applyPendingValues() {
    each(this.get(), p => p.applyPendingValue());
  }

  toUrlParams() {
    if (this.get().length === 0) {
      return "";
    }

    const params = Object.assign(...this.get().map(p => p.toUrlParams()));
    Object.keys(params).forEach(key => params[key] == null && delete params[key]);
    return Object.keys(params)
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
      .join("&");
  }
}

export class QueryResultError {
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
    return Promise.reject(this);
  }

  // eslint-disable-next-line class-methods-use-this
  getStatus() {
    return "failed";
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

const getQuery = query => new Query(query);
const saveOrCreateUrl = data => (data.id ? `api/queries/${data.id}` : "api/queries");
const mapResults = data => ({ ...data, results: map(data.results, getQuery) });

const QueryService = {
  query: params => axios.get("api/queries", { params }).then(mapResults),
  get: data => axios.get(`api/queries/${data.id}`, data).then(getQuery),
  save: data => axios.post(saveOrCreateUrl(data), data).then(getQuery),
  delete: data => axios.delete(`api/queries/${data.id}`),
  recent: params => axios.get(`api/queries/recent`, { params }).then(data => map(data, getQuery)),
  archive: params => axios.get(`api/queries/archive`, { params }).then(mapResults),
  myQueries: params => axios.get("api/queries/my", { params }).then(mapResults),
  fork: ({ id }) => axios.post(`api/queries/${id}/fork`, { id }).then(getQuery),
  resultById: data => axios.get(`api/queries/${data.id}/results.json`),
  asDropdown: data => axios.get(`api/queries/${data.id}/dropdown`),
  associatedDropdown: ({ queryId, dropdownQueryId }) =>
    axios.get(`api/queries/${queryId}/dropdowns/${dropdownQueryId}`),
  favorites: params => axios.get("api/queries/favorites", { params }).then(mapResults),
  favorite: data => axios.post(`api/queries/${data.id}/favorite`),
  unfavorite: data => axios.delete(`api/queries/${data.id}/favorite`),
};

QueryService.newQuery = function newQuery() {
  return new Query({
    query: "",
    name: "New Query",
    schedule: null,
    user: currentUser,
    options: { apply_auto_limit: localOptions.get("applyAutoLimit", true) },
    tags: [],
    can_edit: true,
  });
};

extend(Query, QueryService);
