import { includes, has, get, map, first, isFunction, isEmpty, startsWith } from "lodash";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import notification from "@/services/notification";
import DatabricksDataSource from "@/services/databricks-data-source";
function getDatabases(dataSource: any, refresh = false) {
    if (!dataSource) {
        return Promise.resolve([]);
    }
    return DatabricksDataSource.getDatabases(dataSource, refresh).catch(() => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
        notification.error("Failed to load Database list.", "Please try again later.");
        return Promise.reject();
    });
}
function getSchema(dataSource: any, databaseName: any, refresh = false) {
    if (!dataSource || !databaseName) {
        return Promise.resolve([]);
    }
    return DatabricksDataSource.getDatabaseTables(dataSource, databaseName, refresh).catch(() => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
        notification.error(`Failed to load tables for ${databaseName}.`, "Please try again later.");
        return Promise.reject();
    });
}
function addDisplayNameWithoutDatabaseName(schema: any, databaseName: any) {
    if (!databaseName) {
        return schema;
    }
    // add display name without {databaseName} + "."
    return map(schema, table => {
        const databaseNamePrefix = databaseName + ".";
        let displayName = table.name;
        if (startsWith(table.name, databaseNamePrefix)) {
            displayName = table.name.slice(databaseNamePrefix.length);
        }
        return { ...table, displayName };
    });
}
export default function useDatabricksSchema(dataSource: any, options = null, onOptionsUpdate = null) {
    const [databases, setDatabases] = useState([]);
    const [loadingDatabases, setLoadingDatabases] = useState(true);
    const [currentDatabaseName, setCurrentDatabaseName] = useState();
    const [schemas, setSchemas] = useState({});
    const [loadingSchema, setLoadingSchema] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const setCurrentSchema = useCallback(schema => setSchemas(currentSchemas => ({
        ...currentSchemas,
        // @ts-expect-error ts-migrate(2464) FIXME: A computed property name must be of type 'string',... Remove this comment to see the full error message
        [currentDatabaseName]: schema,
    })), [currentDatabaseName]);
    const currentDatabaseNameRef = useRef();
    currentDatabaseNameRef.current = currentDatabaseName;
    const loadTableColumns = useCallback(tableName => {
        // remove [databaseName.] from the tableName
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        DatabricksDataSource.getTableColumns(dataSource, currentDatabaseName, tableName.substring(currentDatabaseName.length + 1)).then(columns => {
            if (currentDatabaseNameRef.current === currentDatabaseName) {
                setSchemas(currentSchemas => {
                    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                    const schema = get(currentSchemas, currentDatabaseName, []);
                    const updatedSchema = map(schema, table => {
                        if ((table as any).name === tableName) {
                            // @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
                            return { ...table, columns, loading: false };
                        }
                        return table;
                    });
                    return {
                        ...currentSchemas,
                        // @ts-expect-error ts-migrate(2464) FIXME: A computed property name must be of type 'string',... Remove this comment to see the full error message
                        [currentDatabaseName]: updatedSchema,
                    };
                });
            }
        });
    }, [dataSource, currentDatabaseName]);
    const schema = useMemo(() => {
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        const currentSchema = get(schemas, currentDatabaseName, []);
        return addDisplayNameWithoutDatabaseName(currentSchema, currentDatabaseName);
    }, [schemas, currentDatabaseName]);
    const refreshAll = useCallback(() => {
        if (!refreshing) {
            setRefreshing(true);
            const getDatabasesPromise = getDatabases(dataSource, true).then(setDatabases);
            const getSchemasPromise = getSchema(dataSource, currentDatabaseName, true).then(({ schema }) => setCurrentSchema(schema));
            Promise.all([getSchemasPromise.catch(() => { }), getDatabasesPromise.catch(() => { })]).then(() => setRefreshing(false));
        }
    }, [dataSource, currentDatabaseName, setCurrentSchema, refreshing]);
    const schemasRef = useRef();
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{}' is not assignable to type 'undefined'.
    schemasRef.current = schemas;
    useEffect(() => {
        let isCancelled = false;
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'undefined' is not assignable to ... Remove this comment to see the full error message
        if (currentDatabaseName && !has(schemasRef.current, currentDatabaseName)) {
            setLoadingSchema(true);
            getSchema(dataSource, currentDatabaseName)
                .catch(() => Promise.resolve({ schema: [], has_columns: true }))
                .then(({ schema, has_columns }) => {
                if (!isCancelled) {
                    if (!has_columns && !isEmpty(schema)) {
                        schema = map(schema, table => ({ ...table, loading: true }));
                        getSchema(dataSource, currentDatabaseName, true).then(({ schema }) => {
                            if (!isCancelled) {
                                setCurrentSchema(schema);
                            }
                        });
                    }
                    setCurrentSchema(schema);
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
    }, [dataSource, currentDatabaseName, setCurrentSchema]);
    const defaultDatabaseNameRef = useRef();
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'undefined'.
    defaultDatabaseNameRef.current = get(options, "selectedDatabase", null);
    useEffect(() => {
        let isCancelled = false;
        setLoadingDatabases(true);
        setCurrentDatabaseName(undefined);
        setSchemas({});
        getDatabases(dataSource)
            .catch(() => Promise.resolve([]))
            .then(data => {
            if (!isCancelled) {
                setDatabases(data);
                // We set the database using this order:
                // 1. Currently selected value.
                // 2. Last used stored in localStorage.
                // 3. default database.
                // 4. first database in the list.
                let lastUsedDatabase = defaultDatabaseNameRef.current || localStorage.getItem(`lastSelectedDatabricksDatabase_${dataSource.id}`);
                if (!lastUsedDatabase) {
                    lastUsedDatabase = includes(data, "default") ? "default" : first(data) || null;
                }
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
                setCurrentDatabaseName(lastUsedDatabase);
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
    const setCurrentDatabase = useCallback(databaseName => {
        if (databaseName) {
            try {
                localStorage.setItem(`lastSelectedDatabricksDatabase_${dataSource.id}`, databaseName);
            }
            catch (e) {
                // `localStorage.setItem` may throw exception if there are no enough space - in this case it could be ignored
            }
        }
        setCurrentDatabaseName(databaseName);
        if (isFunction(onOptionsUpdate) && databaseName !== defaultDatabaseNameRef.current) {
            // @ts-expect-error ts-migrate(2721) FIXME: Cannot invoke an object which is possibly 'null'.
            onOptionsUpdate({
                // @ts-expect-error ts-migrate(2698) FIXME: Spread types may only be created from object types... Remove this comment to see the full error message
                ...options,
                selectedDatabase: databaseName,
            });
        }
    }, [dataSource.id, options, onOptionsUpdate]);
    return {
        databases,
        loadingDatabases,
        schema,
        loadingSchema,
        currentDatabaseName,
        setCurrentDatabase,
        loadTableColumns,
        refreshAll,
        refreshing,
    };
}
