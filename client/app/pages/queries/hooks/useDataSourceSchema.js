import { reduce } from "lodash";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { SCHEMA_NOT_SUPPORTED } from "@/services/data-source";
import notification from "@/services/notification";

function getSchema(dataSource, refresh = undefined) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  return dataSource
    .getSchema(refresh)
    .then(data => {
      if (data.schema) {
        return data.schema;
      } else if (data.error.code === SCHEMA_NOT_SUPPORTED) {
        return [];
      }
      return Promise.reject(new Error("Schema refresh failed."));
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
