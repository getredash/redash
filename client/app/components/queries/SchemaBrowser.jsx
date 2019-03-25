import { isNil, map, filter, some, includes } from "lodash";
import cx from "classnames";
import { axios } from "@/services/axios";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Checkbox from "antd/lib/checkbox";
import Input from "antd/lib/input";
import Button from "antd/lib/button";
import Tooltip from "antd/lib/tooltip";
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer";
import List from "react-virtualized/dist/commonjs/List";
import useDataSourceSchema from "@/pages/queries/hooks/useDataSourceSchema";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import LoadingState from "../items-list/components/LoadingState";
import { clientConfig } from "@/services/auth";
import notification from "@/services/notification";
import SchemaData from "@/components/queries/SchemaData";

const SchemaItemType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
});

const schemaTableHeight = 22;
const schemaColumnHeight = 18;

function SchemaItem({ item, expanded, onToggle, onSelect, onShowSchema, ...props }) {
  const handleSelect = useCallback(
    (event, ...args) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(...args);
    },
    [onSelect]
  );

  const handleShowSchema = useCallback(
    (event, ...args) => {
      event.preventDefault();
      event.stopPropagation();
      onShowSchema(...args);
    },
    [onShowSchema]
  );

  if (!item) {
    return null;
  }

  return (
    <div {...props}>
      <div className="table-name" onClick={onToggle}>
        <i className="fa fa-table m-r-5" />
        <strong>
          <span title={item.name}>{item.name}</span>
          {!isNil(item.size) && <span> ({item.size})</span>}
        </strong>
        {item.column_metadata && <i
            className="fa fa-question-circle info"
            title="More Info"
            aria-hidden="true"
            onClick={e => handleShowSchema(e, item)}
          />}
        <i
          className="fa fa-angle-double-right copy-to-editor"
          aria-hidden="true"
          onClick={e => handleSelect(e, item.name)}
        />
      </div>
      {expanded && (
        <div>
          {map(item.columns, column => (
            <div key={column.id} className="table-open">
              {column.name}
              <i
                className="fa fa-angle-double-right copy-to-editor"
                aria-hidden="true"
                onClick={e => handleSelect(e, column.name)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

SchemaItem.propTypes = {
  item: SchemaItemType,
  expanded: PropTypes.bool,
  onToggle: PropTypes.func,
  onSelect: PropTypes.func,
};

SchemaItem.defaultProps = {
  item: null,
  expanded: false,
  onToggle: () => {},
  onSelect: () => {},
};

function SchemaLoadingState() {
  return (
    <div className="schema-loading-state">
      <LoadingState className="" />
    </div>
  );
}

export function SchemaList({ loading, schema, expandedFlags, onTableExpand, onItemSelect, openSchemaInfo, closeSchemaInfo }) {
  const [listRef, setListRef] = useState(null);

  useEffect(() => {
    if (listRef) {
      listRef.recomputeRowHeights();
    }
  }, [listRef, schema, expandedFlags]);

  return (
    <div className="schema-browser">
      {loading && <SchemaLoadingState />}
      {!loading && (
        <AutoSizer>
          {({ width, height }) => (
            <List
              ref={setListRef}
              width={width}
              height={height}
              rowCount={schema.length}
              rowHeight={({ index }) => {
                const item = schema[index];
                const columnCount = expandedFlags[item.name] ? item.columns.length : 0;
                return schemaTableHeight + schemaColumnHeight * columnCount;
              }}
              rowRenderer={({ key, index, style }) => {
                const item = schema[index];
                return (
                  <SchemaItem
                    key={key}
                    style={style}
                    item={item}
                    expanded={expandedFlags[item.name]}
                    onToggle={() => onTableExpand(item.name)}
                    onSelect={onItemSelect}
                    onShowSchema={openSchemaInfo}
                  />
                );
              }}
            />
          )}
        </AutoSizer>
      )}
    </div>
  );
}

function itemExists(item) {
  if ("visible" in item) {
    return item.visible;
  } else {
    return false;
  }
};

export function applyFilterOnSchema(schema, filterString, showHidden, toggleString) {
  const filters = filter(filterString.toLowerCase().split(/\s+/), s => s.length > 0);

  // Filter out extra schema that match the provided toggle string
  if (!showHidden && toggleString) {
    const toggleStringRegex = new RegExp(toggleString);
    try {
        schema = filter(
          schema,
          item => !item.name.toLowerCase().match(toggleStringRegex)
        );
      } catch (err) {
        notification.error(`Error while matching schema items: ${err}`);
      }
  }

  // Filter out all columns set to invisible
  schema = filter(schema, itemExists);

  // Empty string: return original schema
  if (filters.length === 0) {
    return schema;
  }

  // Single word: matches table or column
  if (filters.length === 1) {
    const nameFilter = filters[0];
    const columnFilter = filters[0];
    return filter(
      schema,
      item =>
        includes(item.name.toLowerCase(), nameFilter) ||
        some(item.columns, column => includes(column.name.toLowerCase(), columnFilter))
    );
  }

  // Two (or more) words: first matches table, seconds matches column
  const nameFilter = filters[0];
  const columnFilter = filters[1];
  return filter(
    map(schema, item => {
      if (includes(item.name.toLowerCase(), nameFilter)) {
        item = { ...item, columns: filter(item.columns, column => includes(column.name.toLowerCase(), columnFilter)) };
        return item.columns.length > 0 ? item : null;
      }
    })
  );
}

export default function SchemaBrowser({
  dataSource,
  onSchemaUpdate,
  onItemSelect,
  options,
  onOptionsUpdate,
  ...props
}) {
  const [schema, isLoading, refreshSchema] = useDataSourceSchema(dataSource);
  const [filterString, setFilterString] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const toggleString = useToggleString(dataSource ? dataSource.id : undefined);
  const filteredSchema = useMemo(() => applyFilterOnSchema(schema, filterString,
    showHidden, toggleString), [schema, filterString, showHidden, toggleString]);
  const [handleFilterChange] = useDebouncedCallback(setFilterString, 500);
  const [handleToggleChange] = useDebouncedCallback(setShowHidden, 100);
  const [expandedFlags, setExpandedFlags] = useState({});

  const [showSchemaInfo, setShowSchemaInfo] = useState(false);
  const [tableName, setTableName] = useState("");
  const [tableDescription, setTableDescription] = useState("");
  const [tableMetadata, setTableMetadata] = useState([]);
  const [sampleQueries, setSampleQueries] = useState([]);

  const handleSchemaUpdate = useImmutableCallback(onSchemaUpdate);

  useEffect(() => {
    setExpandedFlags({});
  }, [schema]);

  useEffect(() => {
    setExpandedFlags({});
    handleSchemaUpdate(schema);
  }, [schema, handleSchemaUpdate]);

  if (schema.length === 0 && !isLoading) {
    return null;
  }

  function toggleTable(tableName) {
    setExpandedFlags({
      ...expandedFlags,
      [tableName]: !expandedFlags[tableName],
    });
  }

  function useToggleString(dataSourceId) {
    const [toggleString, setToggleString] = useState("");
    useMemo(() => {
      if (!dataSourceId) {
        return null;
      }
      axios.get(
        `${clientConfig.basePath}api/data_sources/${dataSourceId}/toggle_string`
      ).then(data => {
        setToggleString(data.toggle_string);
      })
    }, [dataSourceId]);
    return toggleString;
  }

  function openSchemaInfo(table) {
    setTableName(table.name);
    setTableDescription(table.description);
    setTableMetadata(table.columns);
    setSampleQueries(Object.values(table.sample_queries));
    setShowSchemaInfo(true);
  }

  function closeSchemaInfo() {
    setShowSchemaInfo(false);
  };

  return (
    <div className="schema-container" {...props}>
      <div className="schema-control">
        <Input
          className="m-r-5"
          placeholder="Search schema..."
          disabled={schema.length === 0}
          onChange={event => handleFilterChange(event.target.value)}
        />
        <Tooltip title="Refresh Schema">
          <Button onClick={() => refreshSchema(true)}>
            <i className={cx("zmdi zmdi-refresh", { "zmdi-hc-spin": isLoading })} />
          </Button>
        </Tooltip>
      </div>
      <div>
        {toggleString && <Tooltip placement="right" title={`Matching pattern: ${toggleString}`}>
        <Checkbox
          className="m-t-10"
          checked={showHidden}
          onChange={event => handleToggleChange(event.target.checked)}>
            Show hidden schema
        </Checkbox></Tooltip>}
      </div>
      <SchemaList
        loading={isLoading && schema.length === 0}
        schema={filteredSchema}
        expandedFlags={expandedFlags}
        onTableExpand={toggleTable}
        onItemSelect={onItemSelect}
        toggleString={toggleString}
        openSchemaInfo={openSchemaInfo}
        closeSchemaInfo={closeSchemaInfo}
      />
      <SchemaData
        show={showSchemaInfo}
        tableName={tableName}
        tableDescription={tableDescription}
        tableMetadata={tableMetadata}
        sampleQueries={sampleQueries}
        onClose={closeSchemaInfo}
      />
    </div>
  );
}

SchemaBrowser.propTypes = {
  dataSource: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  onSchemaUpdate: PropTypes.func,
  schema: PropTypes.arrayOf(SchemaItemType),
  onRefresh: PropTypes.func,
  onItemSelect: PropTypes.func,
};

SchemaBrowser.defaultProps = {
  dataSource: null,
  onSchemaUpdate: () => {},
  schema: [],
  onRefresh: () => {},
  onItemSelect: () => {},
};
