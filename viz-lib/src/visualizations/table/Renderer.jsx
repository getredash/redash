import { filter, map, get, initial, last, reduce } from "lodash";
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import Table from "antd/lib/table";
import Input from "antd/lib/input";
import Icon from "antd/lib/icon";
import Popover from "antd/lib/popover";
import { RendererPropTypes } from "@/visualizations/prop-types";

import { prepareColumns, initRows, filterRows, sortRows } from "./utils";

import "./renderer.less";

function joinColumns(array, separator = ", ") {
  return reduce(
    array,
    (result, item, index) => {
      if (index > 0) {
        result.push(separator);
      }
      result.push(item);
      return result;
    },
    []
  );
}

function getSearchColumns(columns, { limit = Infinity, renderColumn = col => col.title } = {}) {
  const firstColumns = map(columns.slice(0, limit), col => renderColumn(col));
  const restColumns = map(columns.slice(limit), col => col.title);
  if (restColumns.length > 0) {
    return [...joinColumns(firstColumns), ` and ${restColumns.length} others`];
  }
  if (firstColumns.length > 1) {
    return [...joinColumns(initial(firstColumns)), ` and `, last(firstColumns)];
  }
  return firstColumns;
}

function SearchInputInfoIcon({ searchColumns }) {
  return (
    <Popover
      arrowPointAtCenter
      placement="topRight"
      content={
        <div className="table-visualization-search-info-content">
          Search {getSearchColumns(searchColumns, { renderColumn: col => <code key={col.name}>{col.title}</code> })}
        </div>
      }>
      <Icon className="table-visualization-search-info-icon" type="info-circle" theme="filled" />
    </Popover>
  );
}

// Some explanation why this weird solution with `clearCallbackRef` is used.
// When visualization options are editing, renderer may re-create table columns quite often.
// Search input is one of table columns, and it does not depend on options.
// We could just render it once and then leave it for React, but there is a feature
// that needs access to Search input's value: when SOME options or data columns change - search
// input should reset. If we'll use managed input's state in renderer itself - it will create
// dependency that will update table columns on every character typed in input.
// Therefore we use this pattern: input manages its state itself, and provides a callback to
// clear value when needed. It's still weird, but at least will not break with new Ant version.

function SearchInput({ searchColumns, clearCallbackRef, ...props }) {
  const [currentValue, setCurrentValue] = useState(props.defaultValue);

  useEffect(() => {
    setCurrentValue(props.value);
  }, [props.value]);

  const onChange = useCallback(
    event => {
      setCurrentValue(event.target.value);
      props.onChange(event.target.value);
    },
    [props.onChange]
  );

  clearCallbackRef.current = useCallback(() => setCurrentValue(""), []);

  if (searchColumns.length <= 0) {
    return null;
  }

  const searchColumnsLimit = 3;
  return (
    <Input.Search
      {...props}
      value={currentValue}
      onChange={onChange}
      placeholder={`Search ${getSearchColumns(searchColumns, { limit: searchColumnsLimit }).join("")}...`}
      suffix={searchColumns.length > searchColumnsLimit ? <SearchInputInfoIcon searchColumns={searchColumns} /> : null}
    />
  );
}

SearchInput.propTypes = {
  clearCallbackRef: PropTypes.object,
  onChange: PropTypes.func,
};

SearchInput.defaultProps = {
  clearCallbackRef: {},
  onChange: () => {},
};

export default function Renderer({ options, data }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState([]);

  const searchColumns = useMemo(() => filter(options.columns, "allowSearch"), [options.columns]);

  const clearSearchInputCallbackRef = useRef();

  const tableColumns = useMemo(() => {
    const searchInput =
      searchColumns.length > 0 ? (
        <SearchInput
          searchColumns={searchColumns}
          clearCallbackRef={clearSearchInputCallbackRef}
          onChange={setSearchTerm}
        />
      ) : null;
    return prepareColumns(options.columns, searchInput, orderBy, newOrderBy => {
      setOrderBy(newOrderBy);
      // Remove text selection - may occur accidentally
      document.getSelection().removeAllRanges();
    });
  }, [options.columns, searchColumns, orderBy]);

  const preparedRows = useMemo(() => sortRows(filterRows(initRows(data.rows), searchTerm, searchColumns), orderBy), [
    data.rows,
    searchTerm,
    searchColumns,
    orderBy,
  ]);

  // If data or config columns change - reset sorting and search
  useEffect(() => {
    setSearchTerm("");
    // Clear search input
    if (clearSearchInputCallbackRef.current) {
      clearSearchInputCallbackRef.current();
    }
    setOrderBy([]);
  }, [options.columns, data.columns]);

  if (data.rows.length === 0) {
    return null;
  }

  return (
    <div className="table-visualization-container">
      <Table
        data-percy="show-scrollbars"
        data-test="TableVisualization"
        columns={tableColumns}
        dataSource={preparedRows}
        pagination={{
          size: get(options, "paginationSize", ""),
          position: "bottom",
          pageSize: options.itemsPerPage,
          hideOnSinglePage: true,
        }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
