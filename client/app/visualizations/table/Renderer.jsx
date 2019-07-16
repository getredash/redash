import { map, filter, sortBy, some } from 'lodash';
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
      key: column.name, // set this since we don't use `dataIndex`
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
    tableColumns = map(tableColumns, ({ title, align, key, ...rest }, index) => ({
      key: key + '(parent)',
      title,
      align,
      children: [{
        ...rest,
        key: key + '(child)',
        align,
        colSpan: index === 0 ? tableColumns.length : 0,
        title: index === 0 ? searchInput : null,
      }],
    }));
  }

  return tableColumns;
}

function filterRows(rows, searchTerm, searchColumns) {
  if (searchTerm !== '') {
    searchTerm = searchTerm.toUpperCase();
    const matchFields = map(searchColumns, (column) => {
      const initColumn = ColumnTypes[column.displayAs];
      const { prepareData } = initColumn(column);
      return (row) => {
        const { text } = prepareData(row);
        return text.toUpperCase().indexOf(searchTerm) >= 0;
      };
    });

    return filter(rows, row => some(matchFields, match => match(row)));
  }
  return rows;
}

export default function Renderer({ options, data }) {
  const [rowKeyPrefix, setRowKeyPrefix] = useState(`row:1:${options.itemsPerPage}:`);
  const [searchTerm, setSearchTerm] = useState('');

  const searchColumns = useMemo(
    () => filter(options.columns, 'allowSearch'),
    [options.columns],
  );

  const preparedRows = useMemo(
    () => filterRows(data.rows, searchTerm, searchColumns),
    [data.rows, searchTerm, searchColumns],
  );

  if (data.rows.length === 0) {
    return null;
  }

  const searchInput = searchColumns.length > 0 ? (
    <Input.Search placeholder="Search..." onChange={e => setSearchTerm(e.target.value)} />
  ) : null;

  return (
    <div className="table-visualization-container">
      <Table
        columns={prepareColumns(options.columns, searchInput)}
        dataSource={preparedRows}
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
