import { filter, map, get, initial, last, reduce } from "lodash";
import React, { useMemo, useState, useEffect } from "react";
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

function SearchInput({ searchColumns, ...props }) {
  if (searchColumns.length <= 0) {
    return null;
  }

  const searchColumnsLimit = 3;
  return (
    <Input.Search
      {...props}
      placeholder={`Search ${getSearchColumns(searchColumns, { limit: searchColumnsLimit }).join("")}...`}
      suffix={searchColumns.length > searchColumnsLimit ? <SearchInputInfoIcon searchColumns={searchColumns} /> : null}
    />
  );
}

SearchInput.propTypes = {
  onChange: PropTypes.func,
};

SearchInput.defaultProps = {
  onChange: () => {},
};

export default function Renderer({ options, data }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState([]);

  const searchColumns = useMemo(() => filter(options.columns, "allowSearch"), [options.columns]);

  const tableColumns = useMemo(() => {
    const searchInput =
      searchColumns.length > 0 ? (
        <SearchInput searchColumns={searchColumns} onChange={event => setSearchTerm(event.target.value)} />
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

  // If data or config columns change - reset sorting
  useEffect(() => {
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
