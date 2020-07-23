import React, { useState, useMemo, useEffect, useCallback } from "react";
import { slice, without, filter, includes } from "lodash";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Input from "antd/lib/input";
import Select from "antd/lib/select";
import { SchemaList, applyFilterOnSchema } from "@/components/queries/SchemaBrowser";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import useDatabricksSchema from "./useDatabricksSchema";

import "./DatabricksSchemaBrowser.less";

// Limit number of rendered options to improve performance until Antd v4
function getLimitedDatabases(databases, currentDatabaseName, limit = 1000) {
  const limitedDatabases = slice(without(databases, currentDatabaseName), 0, limit);

  return currentDatabaseName ? [...limitedDatabases, currentDatabaseName].sort() : limitedDatabases;
}

export default function DatabricksSchemaBrowser({
  dataSource,
  options,
  onOptionsUpdate,
  onSchemaUpdate,
  onItemSelect,
  ...props
}) {
  const {
    databases,
    loadingDatabases,
    schema,
    loadingSchema,
    currentDatabaseName,
    setCurrentDatabase,
  } = useDatabricksSchema(dataSource, options, onOptionsUpdate);
  const [filterString, setFilterString] = useState("");
  const [databaseFilterString, setDatabaseFilterString] = useState("");
  const filteredSchema = useMemo(() => applyFilterOnSchema(schema, filterString), [schema, filterString]);
  const [isDatabaseSelectOpen, setIsDatabaseSelectOpen] = useState(false);
  const [expandedFlags, setExpandedFlags] = useState({});
  const [handleFilterChange] = useDebouncedCallback(setFilterString, 500);
  const [handleDatabaseFilterChange, cancelHandleDatabaseFilterChange] = useDebouncedCallback(
    setDatabaseFilterString,
    500
  );

  const handleDatabaseSelection = useCallback(
    databaseName => {
      setCurrentDatabase(databaseName);
      cancelHandleDatabaseFilterChange();
      setDatabaseFilterString("");
    },
    [cancelHandleDatabaseFilterChange, setCurrentDatabase]
  );

  const filteredDatabases = useMemo(
    () => filter(databases, database => includes(database.toLowerCase(), databaseFilterString.toLowerCase())),
    [databases, databaseFilterString]
  );
  const limitedDatabases = useMemo(() => getLimitedDatabases(filteredDatabases, currentDatabaseName), [
    filteredDatabases,
    currentDatabaseName,
  ]);

  const handleSchemaUpdate = useImmutableCallback(onSchemaUpdate);

  useEffect(() => {
    setExpandedFlags({});
    handleSchemaUpdate(schema);
  }, [schema, handleSchemaUpdate]);

  if (schema.length === 0 && databases.length === 0 && !(loadingDatabases || loadingSchema)) {
    return null;
  }

  function toggleTable(tableName) {
    setExpandedFlags({
      ...expandedFlags,
      [tableName]: !expandedFlags[tableName],
    });
  }

  return (
    <div className="databricks-schema-browser schema-container" {...props}>
      <div className="schema-control">
        <Input
          className={isDatabaseSelectOpen ? "database-select-open" : ""}
          placeholder="Filter tables & columns..."
          disabled={loadingDatabases || loadingSchema}
          onChange={event => handleFilterChange(event.target.value)}
          addonBefore={
            <Select
              dropdownClassName="databricks-schema-browser-db-dropdown"
              loading={loadingDatabases}
              disabled={loadingDatabases}
              onChange={handleDatabaseSelection}
              value={currentDatabaseName}
              showSearch
              onSearch={handleDatabaseFilterChange}
              onDropdownVisibleChange={setIsDatabaseSelectOpen}
              placeholder={
                <>
                  <i className="fa fa-database m-r-5" /> Database
                </>
              }>
              {limitedDatabases.map(database => (
                <Select.Option key={database}>
                  <i className="fa fa-database m-r-5" />
                  {database}
                </Select.Option>
              ))}
              {limitedDatabases.length < filteredDatabases.length && (
                <Select.Option key="hidden_options" value={-1} disabled>
                  Some databases were hidden due to a large set, search to limit results.
                </Select.Option>
              )}
            </Select>
          }
        />
      </div>
      <div className="schema-list-wrapper">
        <SchemaList
          loading={loadingDatabases || loadingSchema}
          schema={filteredSchema}
          expandedFlags={expandedFlags}
          onTableExpand={toggleTable}
          onItemSelect={onItemSelect}
        />
      </div>
    </div>
  );
}

DatabricksSchemaBrowser.propTypes = {
  dataSource: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  options: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onOptionsUpdate: PropTypes.func,
  onSchemaUpdate: PropTypes.func,
  onItemSelect: PropTypes.func,
};

DatabricksSchemaBrowser.defaultProps = {
  dataSource: null,
  options: null,
  onOptionsUpdate: () => {},
  onSchemaUpdate: () => {},
  onItemSelect: () => {},
};
