import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import DataSource from "@/services/data-source";
import notification from "@/services/notification";

function getSchema(dataSource, refresh = undefined) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  return DataSource.fetchSchema(dataSource, refresh).catch(() => {
    notification.error("Schema refresh failed.", "Please try again later.");
    return Promise.resolve([]);
  });
}

export default function useDataSourceSchema(dataSource) {
  const [schema, setSchema] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const refreshSchemaTokenRef = useRef(null);

  const reloadSchema = useCallback(
    (refresh = undefined) => {
      setLoadingSchema(true);
      const refreshToken = Math.random()
        .toString(36)
        .substr(2);
      refreshSchemaTokenRef.current = refreshToken;
      getSchema(dataSource, refresh)
        .then(data => {
          if (refreshSchemaTokenRef.current === refreshToken) {
            setSchema(data);
          }
        })
        .finally(() => {
          if (refreshSchemaTokenRef.current === refreshToken) {
            setLoadingSchema(false);
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

  return useMemo(() => [schema, loadingSchema, reloadSchema], [schema, loadingSchema, reloadSchema]);
}
