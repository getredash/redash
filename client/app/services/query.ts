import moment from "moment";
import debug from "debug";
import Mustache from "mustache";
import { axios } from "@/services/axios";
import { zipObject, isEmpty, isArray, map, filter, includes, union, uniq, has, identity, extend, each, some, clone, find, } from "lodash";
import location from "@/services/location";
import { Parameter, createParameter } from "./parameters";
import { currentUser } from "./auth";
import QueryResult from "./query-result";
import localOptions from "@/lib/localOptions";
Mustache.escape = identity; // do not html-escape values
const logger = debug("redash:services:query");
function collectParams(parts: any) {
    let parameters: any = [];
    parts.forEach((part: any) => {
        if (part[0] === "name" || part[0] === "&") {
            parameters.push(part[1].split(".")[0]);
        }
        else if (part[0] === "#") {
            parameters = union(parameters, collectParams(part[4]));
        }
    });
    return parameters;
}
export class Query {
    $parameters: any;
    data_source_id: any;
    id: any;
    latest_query_data: any;
    latest_query_data_id: any;
    options: any;
    query: any;
    queryResult: any;
    schedule: any;
    constructor(query: any) {
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
    prepareQueryResultExecution(execute: any, maxAge: any) {
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
        }
        else if (this.latest_query_data_id && maxAge !== 0) {
            if (!this.queryResult) {
                this.queryResult = QueryResult.getById(this.id, this.latest_query_data_id);
            }
        }
        else {
            this.queryResult = execute();
        }
        return this.queryResult;
    }
    getQueryResult(maxAge: any) {
        const execute = () => QueryResult.getByQueryId(this.id, this.getParameters().getExecutionValues(), this.getAutoLimit(), maxAge);
        return this.prepareQueryResultExecution(execute, maxAge);
    }
    getQueryResultByText(maxAge: any, selectedQueryText: any) {
        const queryText = selectedQueryText || this.query;
        if (!queryText) {
            return new QueryResultError("Can't execute empty query.");
        }
        const parameters = this.getParameters().getExecutionValues({ joinListValues: true });
        const execute = () => QueryResult.get(this.data_source_id, queryText, parameters, this.getAutoLimit(), maxAge, this.id);
        return this.prepareQueryResultExecution(execute, maxAge);
    }
    getUrl(source: any, hash: any) {
        let url = `queries/${this.id}`;
        if (source) {
            url += "/source";
        }
        let params = {};
        if (this.getParameters().isRequired()) {
            this.getParametersDefs().forEach((param: any) => {
                extend(params, param.toUrlParams());
            });
        }
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
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
        return (Query as any).favorite(this);
    }
    unfavorite() {
        return (Query as any).unfavorite(this);
    }
    clone() {
        const newQuery = clone(this);
        newQuery.$parameters = null;
        newQuery.getParameters();
        return newQuery;
    }
}
class Parameters {
    cachedQueryText: any;
    query: any;
    constructor(query: any, queryString: any) {
        this.query = query;
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
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
            }
            catch (e) {
                logger("Failed parsing parameters: ", e);
                // Return current parameters so we don't reset the list
                parameters = fallback();
            }
        }
        else {
            parameters = fallback();
        }
        return parameters;
    }
    updateParameters(update: any) {
        if (this.query.query === this.cachedQueryText) {
            const parameters = this.query.options.parameters;
            const hasUnprocessedParameters = find(parameters, p => !(p instanceof Parameter));
            if (hasUnprocessedParameters) {
                this.query.options.parameters = map(parameters, p => p instanceof Parameter ? p : createParameter(p, this.query.id));
            }
            return;
        }
        this.cachedQueryText = this.query.query;
        const parameterNames = update ? this.parseQuery() : map(this.query.options.parameters, p => p.name);
        this.query.options.parameters = this.query.options.parameters || [];
        const parametersMap = {};
        this.query.options.parameters.forEach((param: any) => {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            parametersMap[param.name] = param;
        });
        parameterNames.forEach(param => {
            if (!has(parametersMap, param)) {
                // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
                this.query.options.parameters.push(createParameter({
                    title: param,
                    name: param,
                    type: "text",
                    value: null,
                    global: false,
                }));
            }
        });
        const parameterExists = (p: any) => includes(parameterNames, p.name);
        const parameters = this.query.options.parameters;
        this.query.options.parameters = parameters
            .filter(parameterExists)
            .map((p: any) => p instanceof Parameter ? p : createParameter(p, this.query.id));
    }
    initFromQueryString(query: any) {
        this.get().forEach((param: any) => {
            param.fromUrlParams(query);
        });
    }
    get(update = true) {
        this.updateParameters(update);
        return this.query.options.parameters;
    }
    add(parameterDef: any) {
        this.query.options.parameters = this.query.options.parameters.filter((p: any) => p.name !== parameterDef.name);
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 2 arguments, but got 1.
        const param = createParameter(parameterDef);
        this.query.options.parameters.push(param);
        return param;
    }
    getMissing() {
        return map(filter(this.get(), p => p.isEmpty), i => i.title);
    }
    isRequired() {
        return !isEmpty(this.get());
    }
    getExecutionValues(extra = {}) {
        const params = this.get();
        return zipObject(map(params, i => i.name), map(params, i => i.getExecutionValue(extra)));
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
        // @ts-expect-error ts-migrate(2557) FIXME: Expected at least 1 arguments, but got 0 or more.
        const params = Object.assign(...this.get().map((p: any) => p.toUrlParams()));
        Object.keys(params).forEach(key => params[key] == null && delete params[key]);
        return Object.keys(params)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
            .join("&");
    }
}
export class QueryResultError {
    errorMessage: any;
    updatedAt: any;
    constructor(errorMessage: any) {
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
const getQuery = (query: any) => new Query(query);
const saveOrCreateUrl = (data: any) => data.id ? `api/queries/${data.id}` : "api/queries";
const mapResults = (data: any) => ({
    ...data,
    results: map(data.results, getQuery)
});
const QueryService = {
    query: (params: any) => axios.get("api/queries", { params }).then(mapResults),
    get: (data: any) => axios.get(`api/queries/${data.id}`, data).then(getQuery),
    save: (data: any) => axios.post(saveOrCreateUrl(data), data).then(getQuery),
    delete: (data: any) => axios.delete(`api/queries/${data.id}`),
    recent: (params: any) => axios.get(`api/queries/recent`, { params }).then(data => map(data, getQuery)),
    archive: (params: any) => axios.get(`api/queries/archive`, { params }).then(mapResults),
    myQueries: (params: any) => axios.get("api/queries/my", { params }).then(mapResults),
    fork: ({ id }: any) => axios.post(`api/queries/${id}/fork`, { id }).then(getQuery),
    resultById: (data: any) => axios.get(`api/queries/${data.id}/results.json`),
    asDropdown: (data: any) => axios.get(`api/queries/${data.id}/dropdown`),
    associatedDropdown: ({ queryId, dropdownQueryId }: any) => axios.get(`api/queries/${queryId}/dropdowns/${dropdownQueryId}`),
    favorites: (params: any) => axios.get("api/queries/favorites", { params }).then(mapResults),
    favorite: (data: any) => axios.post(`api/queries/${data.id}/favorite`),
    unfavorite: (data: any) => axios.delete(`api/queries/${data.id}/favorite`),
};
(QueryService as any).newQuery = function newQuery() {
    return new Query({
        query: "",
        name: "New Query",
        schedule: null,
        user: currentUser,
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'true' is not assignable to param... Remove this comment to see the full error message
        options: { apply_auto_limit: localOptions.get("applyAutoLimit", true) },
        tags: [],
        can_edit: true,
    });
};
extend(Query, QueryService);
