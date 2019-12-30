import debug from "debug";
import moment from "moment";
import { uniqBy, each, isNumber, isString, includes, extend, forOwn } from "lodash";

const logger = debug("redash:services:QueryResult");
const filterTypes = ["filter", "multi-filter", "multiFilter"];

function getColumnNameWithoutType(column) {
  let typeSplit;
  if (column.indexOf("::") !== -1) {
    typeSplit = "::";
  } else if (column.indexOf("__") !== -1) {
    typeSplit = "__";
  } else {
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

export function getColumnCleanName(column) {
  return getColumnNameWithoutType(column);
}

function getColumnFriendlyName(column) {
  return getColumnNameWithoutType(column).replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

function QueryResultService($resource, $timeout, $q, QueryResultError, Auth) {
  const QueryResultResource = $resource("api/query_results/:id", { id: "@id" }, { post: { method: "POST" } });
  const QueryResultByQueryIdResource = $resource("api/queries/:queryId/results/:id.json", {
    queryId: "@queryId",
    id: "@id",
  });
  const Job = $resource("api/jobs/:id", { id: "@id" });
  const JobWithApiKey = $resource("api/queries/:queryId/jobs/:id", { queryId: "@queryId", id: "@id" });
  const statuses = {
    1: "waiting",
    2: "processing",
    3: "done",
    4: "failed",
  };

  function handleErrorResponse(queryResult, response) {
    if (response.status === 403) {
      queryResult.update(response.data);
    } else if (response.status === 400 && "job" in response.data) {
      queryResult.update(response.data);
    } else if (response.status === 404) {
      queryResult.update({
        job: {
          error: "cached query result unavailable, please execute again.",
          status: 4,
        },
      });
    } else {
      logger("Unknown error", response);
      queryResult.update({
        job: {
          error: response.data.message || "unknown error occurred. Please try again later.",
          status: 4,
        },
      });
    }
  }

  class QueryResult {
    constructor(props) {
      this.deferred = $q.defer();
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

    update(props) {
      extend(this, props);

      if ("query_result" in props) {
        this.status = "done";

        const columnTypes = {};

        // TODO: we should stop manipulating incoming data, and switch to relaying
        // on the column type set by the backend. This logic is prone to errors,
        // and better be removed. Kept for now, for backward compatability.
        each(this.query_result.data.rows, row => {
          forOwn(row, (v, k) => {
            let newType = null;
            if (isNumber(v)) {
              newType = "float";
            } else if (isString(v) && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
              row[k] = moment.utc(v);
              newType = "datetime";
            } else if (isString(v) && v.match(/^\d{4}-\d{2}-\d{2}$/)) {
              row[k] = moment.utc(v);
              newType = "date";
            } else if (typeof v === "object" && v !== null) {
              row[k] = JSON.stringify(v);
            } else {
              newType = "string";
            }

            if (newType !== null) {
              if (columnTypes[k] !== undefined && columnTypes[k] !== newType) {
                columnTypes[k] = "string";
              } else {
                columnTypes[k] = newType;
              }
            }
          });
        });

        each(this.query_result.data.columns, column => {
          column.name = "" + column.name;
          if (columnTypes[column.name]) {
            if (column.type == null || column.type === "string") {
              column.type = columnTypes[column.name];
            }
          }
        });

        this.deferred.resolve(this);
      } else if (this.job.status === 3) {
        this.status = "processing";
      } else if (this.job.status === 4) {
        this.status = statuses[this.job.status];
        this.deferred.reject(new QueryResultError(this.job.error));
      } else {
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
      Job.delete({ id: this.job.id });
    }

    getStatus() {
      if (this.isLoadingResult) {
        return "loading-result";
      }
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
        this.columnNames = this.query_result.data.columns.map(v => v.name);
      }

      return this.columnNames;
    }

    getColumnCleanNames() {
      return this.getColumnNames().map(col => getColumnCleanName(col));
    }

    getColumnFriendlyNames() {
      return this.getColumnNames().map(col => getColumnFriendlyName(col));
    }

    getFilters() {
      if (!this.getColumns()) {
        return [];
      }

      const filters = [];

      this.getColumns().forEach(col => {
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

      this.getRawData().forEach(row => {
        filters.forEach(filter => {
          filter.values.push(row[filter.name]);
          if (filter.values.length === 1) {
            if (filter.multiple) {
              filter.current = [row[filter.name]];
            } else {
              filter.current = row[filter.name];
            }
          }
        });
      });

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

    toPromise() {
      return this.deferred.promise;
    }

    static getById(queryId, id) {
      const queryResult = new QueryResult();

      queryResult.isLoadingResult = true;
      QueryResultByQueryIdResource.get(
        { queryId, id },
        response => {
          // Success handler
          queryResult.isLoadingResult = false;
          queryResult.update(response);
        },
        error => {
          // Error handler
          queryResult.isLoadingResult = false;
          handleErrorResponse(queryResult, error);
        }
      );

      return queryResult;
    }

    loadLatestCachedResult(queryId, parameters) {
      $resource("api/queries/:id/results", { id: "@queryId" }, { post: { method: "POST" } }).post(
        { queryId, parameters },
        response => {
          this.update(response);
        },
        error => {
          handleErrorResponse(this, error);
        }
      );
    }

    loadResult(tryCount) {
      this.isLoadingResult = true;
      QueryResultResource.get(
        { id: this.job.query_result_id },
        response => {
          this.update(response);
          this.isLoadingResult = false;
        },
        error => {
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
          } else {
            $timeout(() => {
              this.loadResult(tryCount + 1);
            }, 1000 * Math.pow(2, tryCount));
          }
        }
      );
    }

    refreshStatus(query, parameters, tryNumber = 1) {
      const resource = Auth.isAuthenticated() ? Job : JobWithApiKey;
      const loadResult = () =>
        Auth.isAuthenticated() ? this.loadResult() : this.loadLatestCachedResult(query, parameters);
      const params = Auth.isAuthenticated() ? { id: this.job.id } : { queryId: query, id: this.job.id };

      resource.get(
        params,
        jobResponse => {
          this.update(jobResponse);

          if (this.getStatus() === "processing" && this.job.query_result_id && this.job.query_result_id !== "None") {
            loadResult();
          } else if (this.getStatus() !== "failed") {
            const waitTime = tryNumber > 10 ? 3000 : 500;
            $timeout(() => {
              this.refreshStatus(query, parameters, tryNumber + 1);
            }, waitTime);
          }
        },
        error => {
          logger("Connection error", error);
          // TODO: use QueryResultError, or better yet: exception/reject of promise.
          this.update({
            job: {
              error: "failed communicating with server. Please check your Internet connection and try again.",
              status: 4,
            },
          });
        }
      );
    }

    getLink(queryId, fileType, apiKey) {
      let link = `api/queries/${queryId}/results/${this.getId()}.${fileType}`;
      if (apiKey) {
        link = `${link}?api_key=${apiKey}`;
      }
      return link;
    }

    getName(queryName, fileType) {
      return `${queryName.replace(/ /g, "_") + moment(this.getUpdatedAt()).format("_YYYY_MM_DD")}.${fileType}`;
    }

    static getByQueryId(id, parameters, maxAge) {
      const queryResult = new QueryResult();

      $resource("api/queries/:id/results", { id: "@id" }, { post: { method: "POST" } }).post(
        {
          id,
          parameters,
          max_age: maxAge,
        },
        response => {
          queryResult.update(response);

          if ("job" in response) {
            queryResult.refreshStatus(id, parameters);
          }
        },
        error => {
          handleErrorResponse(queryResult, error);
        }
      );

      return queryResult;
    }

    static get(dataSourceId, query, parameters, maxAge, queryId) {
      const queryResult = new QueryResult();

      const params = {
        data_source_id: dataSourceId,
        parameters,
        query,
        max_age: maxAge,
      };

      if (queryId !== undefined) {
        params.query_id = queryId;
      }

      QueryResultResource.post(
        params,
        response => {
          queryResult.update(response);

          if ("job" in response) {
            queryResult.refreshStatus(query, parameters);
          }
        },
        error => {
          handleErrorResponse(queryResult, error);
        }
      );

      return queryResult;
    }
  }

  return QueryResult;
}

export default function init(ngModule) {
  ngModule.factory("QueryResult", QueryResultService);
}

init.init = true;
