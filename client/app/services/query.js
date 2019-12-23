import moment from "moment";
import debug from "debug";
import Mustache from "mustache";
import {
  zipObject,
  isEmpty,
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

import { Parameter } from "./parameters";

Mustache.escape = identity; // do not html-escape values

export let Query = null; // eslint-disable-line import/no-mutable-exports

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
    if (this.query.query && this.query.query === this.cachedQueryText) {
      const parameters = this.query.options.parameters;
      const hasUnprocessedParameters = find(parameters, p => !(p instanceof Parameter));
      if (hasUnprocessedParameters) {
        this.query.options.parameters = map(parameters, p =>
          p instanceof Parameter ? p : Parameter.create(p, this.query.id)
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
          Parameter.create({
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
      .map(p => (p instanceof Parameter ? p : Parameter.create(p, this.query.id)));
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
    const param = Parameter.create(parameterDef);
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

  return QueryResultError;
}

function QueryResource($resource, $http, $location, $q, currentUser, QueryResultError, QueryResult) {
  const QueryService = $resource(
    "api/queries/:id",
    { id: "@id" },
    {
      recent: {
        method: "get",
        isArray: true,
        url: "api/queries/recent",
      },
      archive: {
        method: "get",
        isArray: false,
        url: "api/queries/archive",
      },
      query: {
        isArray: false,
      },
      myQueries: {
        method: "get",
        isArray: false,
        url: "api/queries/my",
      },
      fork: {
        method: "post",
        isArray: false,
        url: "api/queries/:id/fork",
        params: { id: "@id" },
      },
      resultById: {
        method: "get",
        isArray: false,
        url: "api/queries/:id/results.json",
      },
      asDropdown: {
        method: "get",
        isArray: true,
        url: "api/queries/:id/dropdown",
      },
      associatedDropdown: {
        method: "get",
        isArray: true,
        url: "api/queries/:queryId/dropdowns/:dropdownQueryId",
      },
      favorites: {
        method: "get",
        isArray: false,
        url: "api/queries/favorites",
      },
      favorite: {
        method: "post",
        isArray: false,
        url: "api/queries/:id/favorite",
        transformRequest: [() => ""], // body not needed
      },
      unfavorite: {
        method: "delete",
        isArray: false,
        url: "api/queries/:id/favorite",
        transformRequest: [() => ""], // body not needed
      },
    }
  );

  QueryService.newQuery = function newQuery() {
    return new QueryService({
      query: "",
      name: "New Query",
      schedule: null,
      user: currentUser,
      options: {},
      tags: [],
      can_edit: true,
    });
  };

  QueryService.format = function formatQuery(syntax, query) {
    if (syntax === "json") {
      try {
        const formatted = JSON.stringify(JSON.parse(query), " ", 4);
        return $q.resolve(formatted);
      } catch (err) {
        return $q.reject(String(err));
      }
    } else if (syntax === "sql") {
      return $http.post("api/queries/format", { query }).then(response => response.data.query);
    } else {
      return $q.reject("Query formatting is not supported for your data source syntax.");
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
    const parts = this.schedule.split(":");
    return moment
      .utc()
      .hour(parts[0])
      .minute(parts[1])
      .local()
      .format("HH:mm");
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
  };

  QueryService.prototype.getQueryResult = function getQueryResult(maxAge) {
    const execute = () => QueryResult.getByQueryId(this.id, this.getParameters().getExecutionValues(), maxAge);
    return this.prepareQueryResultExecution(execute, maxAge);
  };

  QueryService.prototype.getQueryResultByText = function getQueryResultByText(maxAge, selectedQueryText) {
    const queryText = selectedQueryText || this.query;
    if (!queryText) {
      return new QueryResultError("Can't execute empty query.");
    }

    const parameters = this.getParameters().getExecutionValues({ joinListValues: true });
    const execute = () => QueryResult.get(this.data_source_id, queryText, parameters, maxAge, this.id);
    return this.prepareQueryResultExecution(execute, maxAge);
  };

  QueryService.prototype.getUrl = function getUrl(source, hash) {
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

  QueryService.prototype.clone = function cloneQuery() {
    const newQuery = clone(this);
    newQuery.$parameters = null;
    newQuery.getParameters();
    return newQuery;
  };

  return QueryService;
}

export default function init(ngModule) {
  ngModule.factory("QueryResultError", QueryResultErrorFactory);
  ngModule.factory("Query", QueryResource);

  ngModule.run($injector => {
    Query = $injector.get("Query");
  });
}

init.init = true;
