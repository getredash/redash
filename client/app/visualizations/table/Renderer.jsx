import { map, filter, sortBy } from 'lodash';
import React from 'react';
import Table from 'antd/lib/table';
import { RendererPropTypes } from '@/visualizations';

import './renderer.less';
import TextColumn from './columns/TextColumn';
import NumberColumn from './columns/NumberColumn';
import DateTimeColumn from './columns/DateTimeColumn';
import BooleanColumn from './columns/BooleanColumn';
import ImageColumn from './columns/ImageColumn';
import LinkColumn from './columns/LinkColumn';
import JsonColumn from './columns/JsonColumn';

const ColumnRenderers = {
  string: TextColumn,
  number: NumberColumn,
  datetime: DateTimeColumn,
  boolean: BooleanColumn,
  json: JsonColumn,
  image: ImageColumn,
  link: LinkColumn,
};

function prepareColumns(columns) {
  columns = filter(columns, 'visible');
  columns = sortBy(columns, 'order');

  return map(columns, (column) => {
    const result = {
      dataIndex: 'item[' + JSON.stringify(column.name) + ']',
      title: column.title,
      align: column.alignContent,
    };

    const Component = ColumnRenderers[column.displayAs];
    if (Component) {
      result.render = (value, row) => ({
        children: <Component column={column} row={row.item} />,
        props: {
          className: 'display-as-' + column.displayAs,
        },
      });
    }

    return result;
  });
}

function prepareRows(rows) {
  return map(
    rows,
    (item, index) => ({ key: 'row' + index, item }),
  );
}

export default function Renderer({ options, data }) {
  if (data.rows.length === 0) {
    return null;
  }

  return (
    <div className="table-visualization-container">
      <Table
        columns={prepareColumns(options.columns)}
        dataSource={prepareRows(data.rows)}
        pagination={{
          position: 'bottom',
          pageSize: options.itemsPerPage,
          hideOnSinglePage: true,
        }}
      />
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
