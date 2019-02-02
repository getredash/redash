import { isFunction, map, extend, omit } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Table from 'antd/lib/table';
import { Paginator } from '@/components/Paginator';
import ItemsListContext from '../ItemsListContext';

export default class ItemsTable extends React.Component {
  static propTypes = {
    columns: PropTypes.arrayOf(PropTypes.shape({
      field: PropTypes.string,
      orderByField: PropTypes.string,
      render: PropTypes.func,
    })),
    onRowClick: PropTypes.func,
    context: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    columns: [],
    onRowClick: null,
    context: null,
  };

  static contextType = ItemsListContext;

  prepareColumns(columns) {
    const orderByField = this.context.orderByField;
    const orderByDirection = this.context.orderByReverse ? 'descend' : 'ascend';

    return map(
      map(
        columns,
        column => extend(column, { orderByField: column.orderByField || column.field }),
      ),
      (column, index) => extend(
        omit(column, ['field', 'orderByField', 'render']),
        {
          key: 'column' + index,
          dataIndex: 'item[' + JSON.stringify(column.field) + ']',
          defaultSortOrder: column.orderByField === orderByField ? orderByDirection : null,
          onHeaderCell: () => ({
            onClick: () => this.context.toggleSorting(column.orderByField),
          }),
          render: (text, row) => (isFunction(column.render) ? column.render(text, row.item, this.props.context) : text),
        },
      ),
    );
  }

  render() {
    const columns = this.prepareColumns(this.props.columns);
    const rows = map(
      this.context.items,
      (item, index) => ({ key: 'row' + index, item }),
    );

    // Bind events only if `onRowClick` specified
    const onTableRow = isFunction(this.props.onRowClick) ? (
      row => ({
        onClick: (event) => { this.props.onRowClick(event, row.item); },
      })
    ) : null;

    return (
      <div className="bg-white tiled">
        <Table
          className="table-data"
          columns={columns}
          dataSource={rows}
          rowKey={row => row.key}
          pagination={false}
          onRow={onTableRow}
        />
        <Paginator
          totalCount={this.context.totalItemsCount}
          itemsPerPage={this.context.itemsPerPage}
          page={this.context.page}
          onChange={page => this.context.updatePaginator({ page })}
        />
      </div>
    );
  }
}
