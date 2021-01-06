import React, { useState, useMemo, useEffect, useCallback } from "react";
import { filter, includes, get, find } from "lodash";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Button from "antd/lib/button";
import SyncOutlinedIcon from "@ant-design/icons/SyncOutlined";
import Input from "antd/lib/input";
import Select from "antd/lib/select";
import Tooltip from "antd/lib/tooltip";
import { SchemaList, applyFilterOnSchema } from "@/components/queries/SchemaBrowser";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import useDatabricksSchema from "./useDatabricksSchema";

import "./DatabricksSchemaBrowser.less";

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
    loadTableColumns,
    currentDatabaseName,
    setCurrentDatabase,
    refreshAll,
    refreshing,
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

  const handleSchemaUpdate = useImmutableCallback(onSchemaUpdate);

  useEffect(() => {
    handleSchemaUpdate(schema);
  }, [schema, handleSchemaUpdate]);

  useEffect(() => {
    setExpandedFlags({});
  }, [currentDatabaseName]);

  function toggleTable(tableName) {
    const table = find(schema, { name: tableName });
    if (!expandedFlags[tableName] && get(table, "loading", false)) {
      loadTableColumns(tableName);
    }
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
              {filteredDatabases.map(database => (
                <Select.Option key={database}>
                  <i className="fa fa-database m-r-5" />
                  {database}
                </Select.Option>
              ))}
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
        {!(loadingSchema || loadingDatabases) && (
          <div className="load-button">
            <Tooltip title={!refreshing ? "Refresh Databases and Current Schema" : null}>
              <Button type="link" onClick={refreshAll} disabled={refreshing}>
                <SyncOutlinedIcon spin={refreshing} />
              </Button>
            </Tooltip>
          </div>
        )}
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
