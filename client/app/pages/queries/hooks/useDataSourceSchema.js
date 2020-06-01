import { reduce, has } from "lodash";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { axios } from "@/services/axios";
import DataSource, { SCHEMA_NOT_SUPPORTED } from "@/services/data-source";
import notification from "@/services/notification";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getSchema(dataSource, refresh = undefined) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  const fetchSchemaFromJob = data => {
    return axios.get(`api/jobs/${data.job.id}`).then(data => {
      if (data.job.status < 3) {
        return sleep(1000).then(() => fetchSchemaFromJob(data));
      } else if (data.job.status === 3) {
        return data.job.result;
      } else if (data.job.status === 4 && data.job.error.code === SCHEMA_NOT_SUPPORTED) {
        return [];
      } else {
        return Promise.reject(new Error(data.job.error));
      }
    });
  };

  return DataSource.fetchSchema(dataSource, refresh)
    .then(data => {
      if (has(data, "job")) {
        return fetchSchemaFromJob(data);
      }
      return has(data, "schema") ? data.schema : Promise.reject();
    })
    .catch(() => {
      notification.error("Schema refresh failed.", "Please try again later.");
      return Promise.resolve([]);
    });
}

function prepareSchema(schema) {
  schema.tokensCount = reduce(schema, (totalLength, table) => totalLength + table.columns.length, 0);
  return schema;
}

export default function useDataSourceSchema(dataSource) {
  const [schema, setSchema] = useState(prepareSchema([]));
  const refreshSchemaTokenRef = useRef(null);

  const reloadSchema = useCallback(
    (refresh = undefined) => {
      const refreshToken = Math.random()
        .toString(36)
        .substr(2);
      refreshSchemaTokenRef.current = refreshToken;
      getSchema(dataSource, refresh).then(data => {
        if (refreshSchemaTokenRef.current === refreshToken) {
          setSchema(prepareSchema(data));
        }
      });
    },
    [dataSource]
  );

  useEffect(() => {
    reloadSchema();
  }, [reloadSchema]);

  useEffect(() => {
    return () => {
      // cancel pending operations
      refreshSchemaTokenRef.current = null;
    };
  }, []);

  return useMemo(() => [schema, reloadSchema], [schema, reloadSchema]);
}
