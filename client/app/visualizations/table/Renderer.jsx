import { filter } from "lodash";
import React, { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Table from "antd/lib/table";
import Input from "antd/lib/input";
import { RendererPropTypes } from "@/visualizations";

import { prepareColumns, initRows, filterRows, sortRows } from "./utils";

import "./renderer.less";

export default function Renderer({ options, data, context }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState([]);

  const searchColumns = useMemo(() => filter(options.columns, "allowSearch"), [options.columns]);

  const searchInputRef = useRef();
  const onSearchInputChange = useCallback(event => setSearchTerm(event.target.value), [setSearchTerm]);

  const tableColumns = useMemo(() => {
    const searchInput =
      searchColumns.length > 0 ? (
        <Input.Search ref={searchInputRef} placeholder="Search..." onChange={onSearchInputChange} />
      ) : null;

    return prepareColumns(options.columns, searchInput, orderBy, newOrderBy => {
      setOrderBy(newOrderBy);
      // Remove text selection - may occur accidentally
      document.getSelection().removeAllRanges();
    });
  }, [options.columns, searchColumns, searchInputRef, onSearchInputChange, orderBy, setOrderBy]);

  const preparedRows = useMemo(() => sortRows(filterRows(initRows(data.rows), searchTerm, searchColumns), orderBy), [
    data.rows,
    searchTerm,
    searchColumns,
    orderBy,
  ]);

  // If data or config columns change - reset sorting and search
  useEffect(() => {
    setSearchTerm("");
    // Do not use `<Input value={searchTerm}>` because it leads to many renderings and lags on user
    // input. This is the only place where we need to change search input's value from "outer world",
    // so let's use this "hack" for better performance.
    if (searchInputRef.current) {
      // pass value and fake event-like object
      searchInputRef.current.input.setValue("", { target: { value: "" } });
    }
    setOrderBy([]);
  }, [options.columns, data.columns, searchInputRef]);

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
          size: context === "widget" ? "small" : "",
          position: "bottom",
          pageSize: options.itemsPerPage,
          hideOnSinglePage: true,
        }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
