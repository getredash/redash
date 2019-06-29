import React, { useState } from 'react';
import map from 'lodash/map';
import { RendererPropTypes } from '@/visualizations';
import Pagination from 'antd/lib/pagination';

import './details.less';

export default function DetailsRenderer({ data }) {
  const [page, setPage] = useState(0);

  if (!data || !data.rows || data.rows.length === 0) {
    return null;
  }

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
              <td>{'' + row[key]}</td>
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
