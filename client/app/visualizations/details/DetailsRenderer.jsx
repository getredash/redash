import React, { useState } from "react";
import { map, mapValues, keyBy } from "lodash";
import moment from "moment";
import { RendererPropTypes } from "@/visualizations";
import { clientConfig } from "@/services/auth";
import Pagination from "antd/lib/pagination";

import "./details.less";

function renderValue(value, type) {
  const formats = {
    date: clientConfig.dateFormat,
    datetime: clientConfig.dateTimeFormat,
  };

  if (type === "date" || type === "datetime") {
    if (moment.isMoment(value)) {
      return value.format(formats[type]);
    }
  }

  return "" + value;
}

export default function DetailsRenderer({ data }) {
  const [page, setPage] = useState(0);

  if (!data || !data.rows || data.rows.length === 0) {
    return null;
  }

  const types = mapValues(keyBy(data.columns, "name"), "type");

  // We use columsn to maintain order of columns in the view.
  const columns = data.columns.map(column => column.name);
  const row = data.rows[page];

  return (
    <div>
      <table className="table table-bordered details-viz">
        <tbody>
          {map(columns, key => (
            <tr key={key}>
              <th>{key}</th>
              <td>{renderValue(row[key], types[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length > 1 && (
        <div className="paginator-container">
          <Pagination current={page + 1} defaultPageSize={1} total={data.rows.length} onChange={p => setPage(p - 1)} />
        </div>
      )}
    </div>
  );
}

DetailsRenderer.propTypes = RendererPropTypes;
