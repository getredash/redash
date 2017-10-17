import debug from 'debug';
import moment from 'moment';
import { sortBy, uniq, contains, values, some, each, isArray, isNumber, isString, includes } from 'underscore';

const logger = debug('redash:services:QueryResult');
const filterTypes = ['filter', 'multi-filter', 'multiFilter'];

const ALL_VALUES = '*';
const NONE_VALUES = '-';

function getColumnNameWithoutType(column) {
  let typeSplit;
  if (column.indexOf('::') !== -1) {
    typeSplit = '::';
  } else if (column.indexOf('__') !== -1) {
    typeSplit = '__';
  } else {
    return column;
  }

  const parts = column.split(typeSplit);
  if (parts[0] === '' && parts.length === 2) {
    return parts[1];
  }

  if (!contains(filterTypes, parts[1])) {
    return column;
  }

  return parts[0];
}

export function getColumnCleanName(column) {
  const name = getColumnNameWithoutType(column);
  return name;
}

function getColumnFriendlyName(column) {
  return getColumnNameWithoutType(column).replace(/(?:^|\s)\S/g, a =>
    a.toUpperCase());
}

function addPointToSeries(point, seriesCollection, seriesName) {
  if (seriesCollection[seriesName] === undefined) {
    seriesCollection[seriesName] = {
      name: seriesName,
      type: 'column',
      data: [],
    };
  }

  seriesCollection[seriesName].data.push(point);
}


function QueryResultService($resource, $timeout, $q) {
  const QueryResultResource = $resource('api/query_results/:id', { id: '@id' }, { post: { method: 'POST' } });
  const Job = $resource('api/jobs/:id', { id: '@id' });
  const statuses = {
    1: 'waiting',
    2: 'processing',
    3: 'done',
    4: 'failed',
  };

  class QueryResult {
    constructor(props) {
      this.deferred = $q.defer();
      this.job = {};
      this.query_result = {};
      this.status = 'waiting';
      this.filters = undefined;
      this.filterFreeze = undefined;

      this.updatedAt = moment();

      if (props) {
        this.update(props);
      }
    }

    update(props) {
      Object.assign(this, props);

      if ('query_result' in props) {
        this.status = 'done';
        this.filters = undefined;
        this.filterFreeze = undefined;

        const columnTypes = {};

        // TODO: we should stop manipulating incoming data, and switch to relaying
        // on the column type set by the backend. This logic is prone to errors,
        // and better be removed. Kept for now, for backward compatability.
        each(this.query_result.data.rows, (row) => {
          each(row, (v, k) => {
            let newType = null;
            if (isNumber(v)) {
              newType = 'float';
            } else if (isString(v) && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
              row[k] = moment.utc(v);
              newType = 'datetime';
            } else if (isString(v) && v.match(/^\d{4}-\d{2}-\d{2}$/)) {
              row[k] = moment.utc(v);
              newType = 'date';
            } else if (typeof (v) === 'object' && v !== null) {
              row[k] = JSON.stringify(v);
            } else {
              newType = 'string';
            }

            if (newType !== null) {
              if (columnTypes[k] !== undefined && columnTypes[k] !== newType) {
                columnTypes[k] = 'string';
              } else {
                columnTypes[k] = newType;
              }
            }
          });
        });

        each(this.query_result.data.columns, (column) => {
          if (columnTypes[column.name]) {
            if (column.type == null || column.type === 'string') {
              column.type = columnTypes[column.name];
            }
          }
        });

        this.deferred.resolve(this);
      } else if (this.job.status === 3) {
        this.status = 'processing';
      } else {
        this.status = undefined;
      }
    }

    getId() {
      let id = null;
      if ('query_result' in this) {
        id = this.query_result.id;
      }
      return id;
    }

    cancelExecution() {
      Job.delete({ id: this.job.id });
    }

    getStatus() {
      return this.status || statuses[this.job.status];
    }

    getError() {
      // TODO: move this logic to the server...
      if (this.job.error === 'None') {
        return undefined;
      }

      return this.job.error;
    }

    getLog() {
      if (!this.query_result.data ||
          !this.query_result.data.log ||
          this.query_result.data.log.length === 0) {
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

      const data = this.query_result.data.rows;

      return data;
    }

    getData() {
      if (!this.query_result.data) {
        return null;
      }

      function filterValues(filters) {
        if (!filters) {
          return null;
        }

        return filters.reduce(
          (str, filter) =>
            str + filter.current
          , '',
        );
      }

      const filters = this.getFilters();
      const filterFreeze = filterValues(filters);

      if (this.filterFreeze !== filterFreeze) {
        this.filterFreeze = filterFreeze;

        if (filters) {
          filters.forEach((filter) => {
            if (filter.multiple && includes(filter.current, ALL_VALUES)) {
              filter.current = filter.values.slice(2);
            }

            if (filter.multiple && includes(filter.current, NONE_VALUES)) {
              filter.current = [];
            }
          });

          this.filteredData = this.query_result.data.rows.filter(row =>
            filters.reduce((memo, filter) => {
              if (!isArray(filter.current)) {
                filter.current = [filter.current];
              }

              return (memo && some(filter.current, (v) => {
                const value = row[filter.name];
                if (moment.isMoment(value)) {
                  return value.isSame(v);
                }
                // We compare with either the value or the String representation of the value,
                // because Select2 casts true/false to "true"/"false".
                return (v === value || String(value) === v);
              }));
            }, true));
        } else {
          this.filteredData = this.query_result.data.rows;
        }
      }

      return this.filteredData;
    }

    isEmpty() {
      return this.getData() === null || this.getData().length === 0;
    }

    getChartData(mapping) {
      const series = {};

      this.getData().forEach((row) => {
        let point = {};
        let seriesName;
        let xValue = 0;
        const yValues = {};
        let eValue = null;
        let sizeValue = null;

        each(row, (v, definition) => {
          const name = definition.split('::')[0] || definition.split('__')[0];
          let value = v;
          let type = definition.split('::')[1] || definition.split('__')[1];
          if (mapping) {
            type = mapping[definition];
          }

          if (type === 'unused') {
            return;
          }

          if (type === 'x') {
            xValue = value;
            point[type] = value;
          }
          if (type === 'y') {
            if (value == null) {
              value = 0;
            }
            yValues[name] = value;
            point[type] = value;
          }
          if (type === 'yError') {
            eValue = value;
            point[type] = value;
          }

          if (type === 'series') {
            seriesName = String(value);
          }

          if (type === 'size') {
            point[type] = value;
            sizeValue = value;
          }

          if (type === 'multiFilter' || type === 'multi-filter') {
            seriesName = String(value);
          }
        });

        if (seriesName === undefined) {
          each(yValues, (yValue, ySeriesName) => {
            point = { x: xValue, y: yValue };
            if (eValue !== null) {
              point.yError = eValue;
            }

            if (sizeValue !== null) {
              point.size = sizeValue;
            }
            addPointToSeries(point, series, ySeriesName);
          });
        } else {
          addPointToSeries(point, series, seriesName);
        }
      });
      return sortBy(values(series), 'name');
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
      if (!this.filters) {
        this.prepareFilters();
      }

      return this.filters;
    }

    prepareFilters() {
      if (!this.getColumns()) {
        return;
      }

      const filters = [];

      this.getColumns().forEach((col) => {
        const name = col.name;
        const type = name.split('::')[1] || name.split('__')[1];
        if (contains(filterTypes, type)) {
          // filter found
          const filter = {
            name,
            friendlyName: getColumnFriendlyName(name),
            column: col,
            values: [],
            multiple: (type === 'multiFilter') || (type === 'multi-filter'),
          };
          filters.push(filter);
        }
      }, this);

      this.getRawData().forEach((row) => {
        filters.forEach((filter) => {
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

      filters.forEach((filter) => {
        if (filter.multiple) {
          filter.values.unshift(ALL_VALUES);
          filter.values.unshift(NONE_VALUES);
        }
      });

      filters.forEach((filter) => {
        filter.values = uniq(filter.values, (v) => {
          if (moment.isMoment(v)) {
            return v.unix();
          }
          return v;
        });
      });

      this.filters = filters;
    }

    toPromise() {
      return this.deferred.promise;
    }

    static getById(id) {
      const queryResult = new QueryResult();

      QueryResultResource.get({ id }, (response) => {
        queryResult.update(response);
      });

      return queryResult;
    }

    loadResult(tryCount) {
      QueryResultResource.get(
        { id: this.job.query_result_id },
        (response) => {
          this.update(response);
        },
        (error) => {
          if (tryCount === undefined) {
            tryCount = 0;
          }

          if (tryCount > 3) {
            logger('Connection error while trying to load result', error);
            this.update({
              job: {
                error: 'failed communicating with server. Please check your Internet connection and try again.',
                status: 4,
              },
            });
          } else {
            $timeout(() => {
              this.loadResult(tryCount + 1);
            }, 1000 * Math.pow(2, tryCount));
          }
        },
      );
    }

    refreshStatus(query) {
      Job.get({ id: this.job.id }, (jobResponse) => {
        this.update(jobResponse);

        if (this.getStatus() === 'processing' && this.job.query_result_id && this.job.query_result_id !== 'None') {
          this.loadResult();
        } else if (this.getStatus() !== 'failed') {
          $timeout(() => {
            this.refreshStatus(query);
          }, 3000);
        }
      }, (error) => {
        logger('Connection error', error);
        // TODO: use QueryResultError, or better yet: exception/reject of promise.
        this.update({ job: { error: 'failed communicating with server. Please check your Internet connection and try again.', status: 4 } });
      });
    }

    getLink(queryId, fileType, apiKey) {
      let link = `api/queries/${queryId}/results/${this.getId()}.${fileType}`;
      if (apiKey) {
        link = `${link}?api_key=${apiKey}`;
      }
      return link;
    }

    getName(queryName, fileType) {
      return `${queryName.replace(' ', '_') + moment(this.getUpdatedAt()).format('_YYYY_MM_DD')}.${fileType}`;
    }

    static get(dataSourceId, query, maxAge, queryId) {
      const queryResult = new QueryResult();

      const params = { data_source_id: dataSourceId, query, max_age: maxAge };
      if (queryId !== undefined) {
        params.query_id = queryId;
      }

      QueryResultResource.post(params, (response) => {
        queryResult.update(response);

        if ('job' in response) {
          queryResult.refreshStatus(query);
        }
      }, (error) => {
        if (error.status === 403) {
          queryResult.update(error.data);
        } else if (error.status === 400 && 'job' in error.data) {
          queryResult.update(error.data);
        } else {
          logger('Unknown error', error);
          queryResult.update({ job: { error: 'unknown error occurred. Please try again later.', status: 4 } });
        }
      });

      return queryResult;
    }
  }


  return QueryResult;
}

export default function init(ngModule) {
  ngModule.factory('QueryResult', QueryResultService);
}
