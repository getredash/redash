import debug from "debug";
import moment from "moment";
import { axios } from "@/services/axios";
import { QueryResultError } from "@/services/query";
import { Auth } from "@/services/auth";
import { isString, uniqBy, each, isNumber, includes, extend, forOwn, get } from "lodash";
const logger = debug("redash:services:QueryResult");
const filterTypes = ["filter", "multi-filter", "multiFilter"];
function defer() {
    const result = { onStatusChange: (status: any) => { } };
    (result as any).promise = new Promise((resolve, reject) => {
        (result as any).resolve = resolve;
        (result as any).reject = reject;
    });
    return result;
}
function getColumnNameWithoutType(column: any) {
    let typeSplit;
    if (column.indexOf("::") !== -1) {
        typeSplit = "::";
    }
    else if (column.indexOf("__") !== -1) {
        typeSplit = "__";
    }
    else {
        return column;
    }
    const parts = column.split(typeSplit);
    if (parts[0] === "" && parts.length === 2) {
        return parts[1];
    }
    if (!includes(filterTypes, parts[1])) {
        return column;
    }
    return parts[0];
}
function getColumnFriendlyName(column: any) {
    return getColumnNameWithoutType(column).replace(/(?:^|\s)\S/g, (a: any) => a.toUpperCase());
}
const createOrSaveUrl = (data: any) => data.id ? `api/query_results/${data.id}` : "api/query_results";
const QueryResultResource = {
    get: ({ id }: any) => axios.get(`api/query_results/${id}`),
    post: (data: any) => axios.post(createOrSaveUrl(data), data),
};
export const ExecutionStatus = {
    WAITING: "waiting",
    PROCESSING: "processing",
    DONE: "done",
    FAILED: "failed",
    LOADING_RESULT: "loading-result",
};
const statuses = {
    1: ExecutionStatus.WAITING,
    2: ExecutionStatus.PROCESSING,
    3: ExecutionStatus.DONE,
    4: ExecutionStatus.FAILED,
};
function handleErrorResponse(queryResult: any, error: any) {
    const status = get(error, "response.status");
    switch (status) {
        case 403:
            queryResult.update(error.response.data);
            return;
        case 400:
            if ("job" in error.response.data) {
                queryResult.update(error.response.data);
                return;
            }
            break;
        case 404:
            queryResult.update({
                job: {
                    error: "cached query result unavailable, please execute again.",
                    status: 4,
                },
            });
            return;
        // no default
    }
    logger("Unknown error", error);
    queryResult.update({
        job: {
            error: get(error, "response.data.message", "Unknown error occurred. Please try again later."),
            status: 4,
        },
    });
}
function sleep(ms: any) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// @ts-expect-error ts-migrate(7023) FIXME: 'fetchDataFromJob' implicitly has return type 'any... Remove this comment to see the full error message
export function fetchDataFromJob(jobId: any, interval = 1000) {
    return axios.get(`api/jobs/${jobId}`).then(data => {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        const status = statuses[(data as any).job.status];
        if (status === ExecutionStatus.WAITING || status === ExecutionStatus.PROCESSING) {
            return sleep(interval).then(() => fetchDataFromJob((data as any).job.id));
        }
        else if (status === ExecutionStatus.DONE) {
            return (data as any).job.result;
        }
        else if (status === ExecutionStatus.FAILED) {
            return Promise.reject((data as any).job.error);
        }
    });
}
class QueryResult {
    columnNames: any;
    columns: any;
    deferred: any;
    isLoadingResult: any;
    job: any;
    query_result: any;
    status: any;
    updatedAt: any;
    constructor(props: any) {
        this.deferred = defer();
        this.job = {};
        this.query_result = {};
        this.status = "waiting";
        this.updatedAt = moment();
        // extended status flags
        this.isLoadingResult = false;
        if (props) {
            this.update(props);
        }
    }
    update(props: any) {
        extend(this, props);
        if ("query_result" in props) {
            this.status = ExecutionStatus.DONE;
            this.deferred.onStatusChange(ExecutionStatus.DONE);
            const columnTypes = {};
            // TODO: we should stop manipulating incoming data, and switch to relaying
            // on the column type set by the backend. This logic is prone to errors,
            // and better be removed. Kept for now, for backward compatability.
            each(this.query_result.data.rows, row => {
                forOwn(row, (v, k) => {
                    let newType = null;
                    if (isNumber(v)) {
                        newType = "float";
                    }
                    else if (isString(v) && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        row[k] = moment.utc(v);
                        newType = "datetime";
                    }
                    else if (isString(v) && v.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        row[k] = moment.utc(v);
                        newType = "date";
                    }
                    else if (typeof v === "object" && v !== null) {
                        row[k] = JSON.stringify(v);
                    }
                    else {
                        newType = "string";
                    }
                    if (newType !== null) {
                        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        if (columnTypes[k] !== undefined && columnTypes[k] !== newType) {
                            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            columnTypes[k] = "string";
                        }
                        else {
                            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                            columnTypes[k] = newType;
                        }
                    }
                });
            });
            each(this.query_result.data.columns, column => {
                column.name = "" + column.name;
                // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                if (columnTypes[column.name]) {
                    if (column.type == null || column.type === "string") {
                        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
                        column.type = columnTypes[column.name];
                    }
                }
            });
            this.deferred.resolve(this);
        }
        else if (this.job.status === 3 || this.job.status === 2) {
            this.deferred.onStatusChange(ExecutionStatus.PROCESSING);
            this.status = "processing";
        }
        else if (this.job.status === 4) {
            // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
            this.status = statuses[this.job.status];
            this.deferred.reject(new QueryResultError(this.job.error));
        }
        else {
            this.deferred.onStatusChange(undefined);
            this.status = undefined;
        }
    }
    getId() {
        let id = null;
        if ("query_result" in this) {
            id = this.query_result.id;
        }
        return id;
    }
    cancelExecution() {
        axios.delete(`api/jobs/${this.job.id}`);
    }
    getStatus() {
        if (this.isLoadingResult) {
            return ExecutionStatus.LOADING_RESULT;
        }
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return this.status || statuses[this.job.status];
    }
    getError() {
        // TODO: move this logic to the server...
        if (this.job.error === "None") {
            return undefined;
        }
        return this.job.error;
    }
    getLog() {
        if (!this.query_result.data || !this.query_result.data.log || this.query_result.data.log.length === 0) {
            return null;
        }
        return this.query_result.data.log;
    }
    getUpdatedAt() {
        return this.query_result.retrieved_at || this.job.updated_at * 1000.0 || this.updatedAt;
    }
    getRuntime() {
        return this.query_result.runtime;
    }
    getRawData() {
        if (!this.query_result.data) {
            return null;
        }
        return this.query_result.data.rows;
    }
    getData() {
        return this.query_result.data ? this.query_result.data.rows : null;
    }
    isEmpty() {
        return this.getData() === null || this.getData().length === 0;
    }
    getColumns() {
        if (this.columns === undefined && this.query_result.data) {
            this.columns = this.query_result.data.columns;
        }
        return this.columns;
    }
    getColumnNames() {
        if (this.columnNames === undefined && this.query_result.data) {
            this.columnNames = this.query_result.data.columns.map((v: any) => v.name);
        }
        return this.columnNames;
    }
    getColumnFriendlyNames() {
        return this.getColumnNames().map((col: any) => getColumnFriendlyName(col));
    }
    getFilters() {
        if (!this.getColumns()) {
            return [];
        }
        const filters: any = [];
        this.getColumns().forEach((col: any) => {
            const name = col.name;
            const type = name.split("::")[1] || name.split("__")[1];
            if (includes(filterTypes, type)) {
                // filter found
                const filter = {
                    name,
                    friendlyName: getColumnFriendlyName(name),
                    column: col,
                    values: [],
                    multiple: type === "multiFilter" || type === "multi-filter",
                };
                filters.push(filter);
            }
        }, this);
        this.getRawData().forEach((row: any) => {
            // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'filter' implicitly has an 'any' type.
            filters.forEach(filter => {
                filter.values.push(row[filter.name]);
                if (filter.values.length === 1) {
                    if (filter.multiple) {
                        filter.current = [row[filter.name]];
                    }
                    else {
                        filter.current = row[filter.name];
                    }
                }
            });
        });
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'filter' implicitly has an 'any' type.
        filters.forEach(filter => {
            filter.values = uniqBy(filter.values, v => {
                if (moment.isMoment(v)) {
                    return v.unix();
                }
                return v;
            });
        });
        return filters;
    }
    toPromise(statusCallback: any) {
        if (statusCallback) {
            this.deferred.onStatusChange = statusCallback;
        }
        return this.deferred.promise;
    }
    static getById(queryId: any, id: any) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
        const queryResult = new QueryResult();
        queryResult.isLoadingResult = true;
        queryResult.deferred.onStatusChange(ExecutionStatus.LOADING_RESULT);
        axios
            .get(`api/queries/${queryId}/results/${id}.json`)
            .then(response => {
            // Success handler
            queryResult.isLoadingResult = false;
            queryResult.update(response);
        })
            .catch(error => {
            // Error handler
            queryResult.isLoadingResult = false;
            handleErrorResponse(queryResult, error);
        });
        return queryResult;
    }
    loadLatestCachedResult(queryId: any, parameters: any) {
        axios
            .post(`api/queries/${queryId}/results`, { queryId, parameters })
            .then(response => {
            this.update(response);
        })
            .catch(error => {
            handleErrorResponse(this, error);
        });
    }
    loadResult(tryCount: any) {
        this.isLoadingResult = true;
        this.deferred.onStatusChange(ExecutionStatus.LOADING_RESULT);
        QueryResultResource.get({ id: this.job.query_result_id })
            .then(response => {
            this.update(response);
            this.isLoadingResult = false;
        })
            .catch(error => {
            if (tryCount === undefined) {
                tryCount = 0;
            }
            if (tryCount > 3) {
                logger("Connection error while trying to load result", error);
                this.update({
                    job: {
                        error: "failed communicating with server. Please check your Internet connection and try again.",
                        status: 4,
                    },
                });
                this.isLoadingResult = false;
            }
            else {
                setTimeout(() => {
                    this.loadResult(tryCount + 1);
                }, 1000 * Math.pow(2, tryCount));
            }
        });
    }
    refreshStatus(query: any, parameters: any, tryNumber = 1) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
        const loadResult = () => Auth.isAuthenticated() ? this.loadResult() : this.loadLatestCachedResult(query, parameters);
        const request = Auth.isAuthenticated()
            ? axios.get(`api/jobs/${this.job.id}`)
            : axios.get(`api/queries/${query}/jobs/${this.job.id}`);
        request
            .then(jobResponse => {
            this.update(jobResponse);
            if (this.getStatus() === "processing" && this.job.query_result_id && this.job.query_result_id !== "None") {
                loadResult();
            }
            else if (this.getStatus() !== "failed") {
                const waitTime = tryNumber > 10 ? 3000 : 500;
                setTimeout(() => {
                    this.refreshStatus(query, parameters, tryNumber + 1);
                }, waitTime);
            }
        })
            .catch(error => {
            logger("Connection error", error);
            // TODO: use QueryResultError, or better yet: exception/reject of promise.
            this.update({
                job: {
                    error: "failed communicating with server. Please check your Internet connection and try again.",
                    status: 4,
                },
            });
        });
    }
    getLink(queryId: any, fileType: any, apiKey: any) {
        let link = `api/queries/${queryId}/results/${this.getId()}.${fileType}`;
        if (apiKey) {
            link = `${link}?api_key=${apiKey}`;
        }
        return link;
    }
    getName(queryName: any, fileType: any) {
        return `${queryName.replace(/ /g, "_") + moment(this.getUpdatedAt()).format("_YYYY_MM_DD")}.${fileType}`;
    }
    static getByQueryId(id: any, parameters: any, applyAutoLimit: any, maxAge: any) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
        const queryResult = new QueryResult();
        axios
            .post(`api/queries/${id}/results`, { id, parameters, apply_auto_limit: applyAutoLimit, max_age: maxAge })
            .then(response => {
            queryResult.update(response);
            if ("job" in response) {
                queryResult.refreshStatus(id, parameters);
            }
        })
            .catch(error => {
            handleErrorResponse(queryResult, error);
        });
        return queryResult;
    }
    static get(dataSourceId: any, query: any, parameters: any, applyAutoLimit: any, maxAge: any, queryId: any) {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
        const queryResult = new QueryResult();
        const params = {
            data_source_id: dataSourceId,
            parameters,
            query,
            apply_auto_limit: applyAutoLimit,
            max_age: maxAge,
        };
        if (queryId !== undefined) {
            (params as any).query_id = queryId;
        }
        QueryResultResource.post(params)
            .then(response => {
            queryResult.update(response);
            if ("job" in response) {
                queryResult.refreshStatus(query, parameters);
            }
        })
            .catch(error => {
            handleErrorResponse(queryResult, error);
        });
        return queryResult;
    }
}
export default QueryResult;
