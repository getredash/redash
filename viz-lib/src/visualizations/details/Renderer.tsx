import React, { useState, useMemo } from "react";
import { map, filter, sortBy } from "lodash";
import { RendererPropTypes } from "@/visualizations/prop-types";
import Descriptions from "antd/lib/descriptions";
import Pagination from "antd/lib/pagination";
import Tooltip from "antd/lib/tooltip";

import ColumnTypes from "../shared/columns";
import "./details.less";


export default function Renderer({ data, options }: any) {
  const [page, setPage] = useState(0);

  const visibleColumns = useMemo(() => {
    if (!options?.columns) return [];

    const columns = sortBy(filter(options.columns, "visible"), "order");

    return columns.map((column: any) => {
      // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
      const ColumnType = ColumnTypes[column.displayAs] || ColumnTypes.string;
      const Component = ColumnType(column);

      return {
        ...column,
        Component,
      };
    });
  }, [options?.columns]);

  if (!data || !data.rows || data.rows.length === 0) {
    return null;
  }

  const row = data.rows[page];

  return (
    <div className="details-viz">
      <Descriptions size="small" column={1} bordered>
        {map(visibleColumns, column => {
          const { Component } = column;

          return (
            <Descriptions.Item
              key={column.name}
              label={
                <React.Fragment>
                  {column.description && (
                    <span style={{ paddingRight: 5 }}>
                      <Tooltip placement="top" title={column.description}>
                        <i className="fa fa-info-circle" aria-hidden="true"></i>
                      </Tooltip>
                    </span>
                  )}
                  {column.title || column.name}
                </React.Fragment>
              }
            >
              <div style={{ textAlign: column.alignContent || "left" }}>
                <Component row={row} />
              </div>
            </Descriptions.Item>
          );
        })}
      </Descriptions>
      {data.rows.length > 1 && (
        <div className="paginator-container">
          <Pagination
            showSizeChanger={false}
            current={page + 1}
            defaultPageSize={1}
            total={data.rows.length}
            onChange={p => setPage(p - 1)}
          />
        </div>
      )}
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
