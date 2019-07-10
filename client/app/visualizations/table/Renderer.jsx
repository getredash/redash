import { map, filter, sortBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import Table from 'antd/lib/table';
import Input from 'antd/lib/input';
import { RendererPropTypes } from '@/visualizations';

import ColumnTypes from './columns';
import './renderer.less';

function prepareColumns(columns, searchInput = null) {
  columns = filter(columns, 'visible');
  columns = sortBy(columns, 'order');

  let tableColumns = map(columns, (column) => {
    const result = {
      // Column name may contain any characters (or be empty at all), therefore
      // we cannot use `dataIndex` since it has special syntax and will not work
      // for all possible column names. Instead, we'll generate `dataIndex` dynamically
      // based on row index
      dataIndex: null,
      title: column.title,
      align: column.alignContent,
    };

    const initColumn = ColumnTypes[column.displayAs];
    const Component = initColumn(column);
    result.render = (unused, row) => ({
      children: <Component row={row} />,
      props: {
        className: 'display-as-' + column.displayAs,
      },
    });

    return result;
  });

  if (searchInput) {
    // We need a merged head cell through entire row. With Ant's Table the only way to do it
    // is to add a single child to every column move `dataIndex` property to it and set
    // `colSpan` to 0 for every child cell except of the 1st one - which should be expanded.
    tableColumns = map(tableColumns, ({ dataIndex, ...rest }, index) => ({
      ...rest,
      children: [{
        dataIndex,
        colSpan: index === 0 ? tableColumns.length : 0,
        title: index === 0 ? searchInput : null,
      }],
    }));
  }

  return tableColumns;
}

export default function Renderer({ options, data }) {
  const [rowKeyPrefix, setRowKeyPrefix] = useState(0);

  const searchColumns = useMemo(
    () => filter(options.columns, 'allowSearch'),
    [options.columns],
  );

  if (data.rows.length === 0) {
    return null;
  }

  const searchInput = searchColumns.length > 0 ? (
    <Input.Search placeholder="Search..." />
  ) : null;

  return (
    <div className="table-visualization-container">
      <Table
        columns={prepareColumns(options.columns, searchInput)}
        dataSource={data.rows}
        rowKey={(record, index) => rowKeyPrefix + index}
        pagination={{
          position: 'bottom',
          pageSize: options.itemsPerPage,
          hideOnSinglePage: true,
          onChange: (page, pageSize) => setRowKeyPrefix(`row:${page}:${pageSize}:`),
        }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
