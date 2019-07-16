import { filter } from 'lodash';
import React, { useMemo, useState } from 'react';
import Table from 'antd/lib/table';
import Input from 'antd/lib/input';
import { RendererPropTypes } from '@/visualizations';

import { prepareColumns, filterRows, sortRows } from './utils';

import './renderer.less';

export default function Renderer({ options, data }) {
  const [rowKeyPrefix, setRowKeyPrefix] = useState(`row:1:${options.itemsPerPage}:`);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState([]);

  const searchColumns = useMemo(
    () => filter(options.columns, 'allowSearch'),
    [options.columns],
  );

  const tableColumns = useMemo(
    () => {
      const searchInput = searchColumns.length > 0 ? (
        <Input.Search placeholder="Search..." onChange={e => setSearchTerm(e.target.value)} />
      ) : null;

      return prepareColumns(options.columns, searchInput, orderBy, (newOrderBy) => {
        setOrderBy(newOrderBy);
        // Remove text selection - may occur accidentally
        document.getSelection().removeAllRanges();
      });
    },
    [options.columns, searchColumns, setSearchTerm, orderBy, setOrderBy],
  );

  const preparedRows = useMemo(
    () => sortRows(filterRows(data.rows, searchTerm, searchColumns), orderBy),
    [data.rows, searchTerm, searchColumns, orderBy],
  );

  if (data.rows.length === 0) {
    return null;
  }

  return (
    <div className="table-visualization-container">
      <Table
        columns={tableColumns}
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
