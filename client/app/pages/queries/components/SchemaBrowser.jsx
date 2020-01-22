import { isNil, map, filter, some, includes } from "lodash";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Input from "antd/lib/input";
import Button from "antd/lib/button";
import Tooltip from "antd/lib/tooltip";
import AutoSizer from "react-virtualized/dist/commonjs/AutoSizer";
import List from "react-virtualized/dist/commonjs/List";

const SchemaItemType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
});

const schemaTableHeight = 22;
const schemaColumnHeight = 18;

function SchemaItem({ item, expanded, onToggle, onSelect, ...props }) {
  const handleSelect = useCallback(
    (event, ...args) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(...args);
    },
    [onSelect]
  );

  if (!item) {
    return null;
  }

  return (
    <div {...props}>
      <div className="table-name" onClick={onToggle}>
        <i className="fa fa-table m-r-5" />
        <strong>
          <span title="{{table.name}}">{item.name}</span>
          {!isNil(item.size) && <span> ({item.size})</span>}
        </strong>
        <i
          className="fa fa-angle-double-right copy-to-editor"
          aria-hidden="true"
          onClick={e => handleSelect(e, item.name)}
        />
      </div>
      {expanded && (
        <div>
          {map(item.columns, column => (
            <div key={column} className="table-open">
              {column}
              <i
                className="fa fa-angle-double-right copy-to-editor"
                aria-hidden="true"
                onClick={e => handleSelect(e, column)}
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

function applyFilter(schema, filterString) {
  const filters = filter(filterString.toLowerCase().split(/\s+/), s => s.length > 0);

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
        some(item.columns, column => includes(column.toLowerCase(), columnFilter))
    );
  }

  // Two (or more) words: first matches table, seconds matches column
  const nameFilter = filters[0];
  const columnFilter = filters[1];
  return filter(
    map(schema, item => {
      if (includes(item.name.toLowerCase(), nameFilter)) {
        item = { ...item, columns: filter(item.columns, column => includes(column.toLowerCase(), columnFilter)) };
        return item.columns.length > 0 ? item : null;
      }
    })
  );
}

export default function SchemaBrowser({ schema, onRefresh, onItemSelect, ...props }) {
  const [filterString, setFilterString] = useState("");
  const filteredSchema = useMemo(() => applyFilter(schema, filterString), [schema, filterString]);
  const [expandedFlags, setExpandedFlags] = useState({});
  const [handleFilterChange] = useDebouncedCallback(setFilterString, 500);
  const [listRef, setListRef] = useState(null);

  useEffect(() => {
    setExpandedFlags({});
  }, [schema]);

  useEffect(() => {
    if (listRef) {
      listRef.recomputeRowHeights();
    }
  }, [listRef, filteredSchema, expandedFlags]);

  if (schema.length === 0) {
    return null;
  }

  function toggleTable(tableName) {
    setExpandedFlags({
      ...expandedFlags,
      [tableName]: !expandedFlags[tableName],
    });
  }

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
          <Button onClick={onRefresh}>
            <i className="zmdi zmdi-refresh" />
          </Button>
        </Tooltip>
      </div>
      <div className="schema-browser">
        <AutoSizer>
          {({ width, height }) => (
            <List
              ref={setListRef}
              width={width}
              height={height}
              rowCount={filteredSchema.length}
              rowHeight={({ index }) => {
                const item = filteredSchema[index];
                const columnCount = expandedFlags[item.name] ? item.columns.length : 0;
                return schemaTableHeight + schemaColumnHeight * columnCount;
              }}
              rowRenderer={({ key, index, style }) => {
                const item = filteredSchema[index];
                return (
                  <SchemaItem
                    key={key}
                    style={style}
                    item={item}
                    expanded={expandedFlags[item.name]}
                    onToggle={() => toggleTable(item.name)}
                    onSelect={onItemSelect}
                  />
                );
              }}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

SchemaBrowser.propTypes = {
  schema: PropTypes.arrayOf(SchemaItemType),
  onRefresh: PropTypes.func,
  onItemSelect: PropTypes.func,
};

SchemaBrowser.defaultProps = {
  schema: [],
  onRefresh: () => {},
  onItemSelect: () => {},
};
