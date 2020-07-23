import { has, get, first, isFunction } from "lodash";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import notification from "@/services/notification";
import DatabricksDataSource from "@/services/databricks-data-source";

function getDatabases(dataSource) {
  if (!dataSource) {
    return Promise.resolve([]);
  }

  return DatabricksDataSource.getDatabases(dataSource).catch(() => {
    notification.error("Failed to load Database list", "Please try again later.");
    return Promise.resolve([]);
  });
}

function getSchema(dataSource, databaseName) {
  if (!dataSource || !databaseName) {
    return Promise.resolve([]);
  }

  return DatabricksDataSource.getDatabaseTables(dataSource, databaseName).catch(() => {
    notification.error("Failed to load Schema", "Please try again later.");
    return Promise.resolve([]);
  });
}

export default function useDatabricksSchema(dataSource, options = null, onOptionsUpdate = null) {
  const [databases, setDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [currentDatabaseName, setCurrentDatabaseName] = useState();
  const [schemas, setSchemas] = useState({});
  const [loadingSchema, setLoadingSchema] = useState(false);

  const schema = useMemo(() => get(schemas, currentDatabaseName, []), [schemas, currentDatabaseName]);

  const schemasRef = useRef();
  schemasRef.current = schemas;
  useEffect(() => {
    let isCancelled = false;
    if (currentDatabaseName && !has(schemasRef.current, currentDatabaseName)) {
      setLoadingSchema(true);
      getSchema(dataSource, currentDatabaseName)
        .then(data => {
          if (!isCancelled) {
            setSchemas(currentSchemas => ({
              ...currentSchemas,
              [currentDatabaseName]: data,
            }));
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setLoadingSchema(false);
          }
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [dataSource, currentDatabaseName]);

  const defaultDatabaseNameRef = useRef();
  defaultDatabaseNameRef.current = get(options, "selectedDatabase", null);
  useEffect(() => {
    let isCancelled = false;
    setLoadingDatabases(true);
    getDatabases(dataSource)
      .then(data => {
        if (!isCancelled) {
          setDatabases(data);
          setCurrentDatabaseName(
            defaultDatabaseNameRef.current ||
              localStorage.getItem(`lastSelectedDatabricksDatabase_${dataSource.id}`) ||
              first(data) ||
              null
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoadingDatabases(false);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [dataSource]);

  const setCurrentDatabase = useCallback(
    databaseName => {
      if (databaseName) {
        try {
          localStorage.setItem(`lastSelectedDatabricksDatabase_${dataSource.id}`, databaseName);
        } catch (e) {
          // `localStorage.setItem` may throw exception if there are no enough space - in this case it could be ignored
        }
      }
      setCurrentDatabaseName(databaseName);
      if (isFunction(onOptionsUpdate) && databaseName !== defaultDatabaseNameRef.current) {
        onOptionsUpdate({
          ...options,
          selectedDatabase: databaseName,
        });
      }
    },
    [dataSource.id, options, onOptionsUpdate]
  );

  return {
    databases,
    loadingDatabases,
    schema,
    loadingSchema,
    currentDatabaseName,
    setCurrentDatabase,
  };
}
