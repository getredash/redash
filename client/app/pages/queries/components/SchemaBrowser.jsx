import { isNil, map, filter, find, includes } from 'lodash';
import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';

const SchemaItemType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  size: PropTypes.number,
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
});

function SchemaItem({ item, onSelect }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSelect = useCallback((event, ...args) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(...args);
  }, [onSelect]);

  if (!item) {
    return null;
  }

  return (
    <div>
      <div className="table-name" onClick={() => setIsExpanded(!isExpanded)}>
        <i className="fa fa-table m-r-5" />
        <strong>
          <span title="{{table.name}}">{item.name}</span>
          {!isNil(item.size) && (<span> ({item.size})</span>)}
        </strong>
        <i className="fa fa-angle-double-right copy-to-editor" aria-hidden="true" onClick={e => handleSelect(e, item.name)} />
      </div>
      {isExpanded && (
        <div>
          {map(item.columns, column => (
            <div key={column} className="table-open">
              {column}
              <i className="fa fa-angle-double-right copy-to-editor" aria-hidden="true" onClick={e => handleSelect(e, column)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

SchemaItem.propTypes = {
  item: SchemaItemType,
  onSelect: PropTypes.func,
};

SchemaItem.defaultProps = {
  item: null,
  onSelect: () => {},
};

function applyFilter(schema, filterString) {
  const filters = filter(filterString.toLowerCase().split(/\s+/), s => s.length > 0);

  // Empty string: return original schema
  if (filters.length === 0) {
    return map(schema, item => ({ ...item, matchesFilter: true }));
  }

  // Single word: matches table or column
  if (filters.length === 1) {
    const nameFilter = filters[0];
    const columnFilter = filters[0];
    return map(schema, item => ({
      ...item,
      matchesFilter: (
        includes(item.name.toLowerCase(), nameFilter) ||
        find(item.columns, column => includes(column.toLowerCase(), columnFilter))
      ),
    }));
  }

  // Two (or more) words: first matches table, seconds matches column
  const nameFilter = filters[0];
  const columnFilter = filters[1];
  return filter(map(schema, (item) => {
    item = { ...item, matchesFilter: false };
    if (includes(item.name.toLowerCase(), nameFilter)) {
      item.columns = filter(item.columns, column => includes(column.toLowerCase(), columnFilter));
      item.matchesFilter = item.columns.length > 0;
    }
  }));
}

export default function SchemaBrowser({ schema, onRefresh, ...props }) {
  const [filterString, setFilterString] = useState('');
  const filteredSchema = useMemo(() => applyFilter(schema, filterString), [schema, filterString]);

  const [handleFilterChange] = useDebouncedCallback(setFilterString, 500);

  if (schema.length === 0) {
    return null;
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
        {map(filteredSchema, item => <SchemaItem key={item.name} item={item.matchesFilter ? item : null} />)}
      </div>
    </div>
  );
}

SchemaBrowser.propTypes = {
  schema: PropTypes.arrayOf(SchemaItemType),
  onRefresh: PropTypes.func,
};

SchemaBrowser.defaultProps = {
  schema: [],
  onRefresh: () => {},
};
