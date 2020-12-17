import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import DataSource from "@/services/data-source";
import notification from "@/services/notification";

function getSchema(dataSource: any, refresh = undefined) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  return DataSource.fetchSchema(dataSource, refresh).catch(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
    notification.error("Schema refresh failed.", "Please try again later.");
    return Promise.resolve([]);
  });
}

export default function useDataSourceSchema(dataSource: any) {
  const [schema, setSchema] = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const refreshSchemaTokenRef = useRef(null);

  const reloadSchema = useCallback(
    (refresh = undefined) => {
      setLoadingSchema(true);
      const refreshToken = Math.random()
        .toString(36)
        .substr(2);
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null'.
      refreshSchemaTokenRef.current = refreshToken;
      getSchema(dataSource, refresh)
        .then(data => {
          if (refreshSchemaTokenRef.current === refreshToken) {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'any[] | never[]' is not assignab... Remove this comment to see the full error message
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
