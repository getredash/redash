import { map, filter, sortBy } from 'lodash';
import React from 'react';
import Table from 'antd/lib/table';
import { RendererPropTypes } from '@/visualizations';

import './renderer.less';

function prepareColumns(columns) {
  columns = filter(columns, 'visible');
  columns = sortBy(columns, 'order');

  return map(columns, col => ({
    dataIndex: 'item[' + JSON.stringify(col.name) + ']',
    title: col.title,
    align: col.alignContent,
  }));
}

export default function Renderer({ options, data }) {
  if (data.rows.length === 0) {
    return null;
  }

  return (
    <div className="table-visualization-container">
      <Table
        columns={prepareColumns(options.columns)}
        dataSource={map(
          data.rows,
          (item, index) => ({ key: 'row' + index, item }),
        )}
        pagination={{
          position: 'bottom',
          pageSize: options.itemsPerPage,
        }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
