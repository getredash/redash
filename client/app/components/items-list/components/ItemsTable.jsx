import { isFunction, map, extend, omit, identity } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Table from 'antd/lib/table';
import { FavoritesControl } from '@/components/FavoritesControl';
import { TimeAgo } from '@/components/TimeAgo';
import { durationHumanize } from '@/filters';
import { formatDateTime } from '@/filters/datetime';

// `this` refers to previous function in the chain (`Columns.***`).
// Adds `sorter: true` field to column definition
function sortable(...args) {
  return extend(this(...args), { sorter: true });
}

export const Columns = {
  favorites(overrides) {
    return extend({
      width: '1%',
      render: (text, item) => <FavoritesControl item={item} />,
    }, overrides);
  },
  avatar(overrides, formatTitle) {
    formatTitle = isFunction(formatTitle) ? formatTitle : identity;
    return extend({
      width: '1%',
      render: (user, item) => (
        <img
          src={item.user.profile_image_url}
          className="profile__image_thumb"
          alt={formatTitle(user.name, item)}
          title={formatTitle(user.name, item)}
        />
      ),
    }, overrides);
  },
  dateTime(overrides) {
    return extend({
      width: '1%',
      className: 'text-nowrap',
      render: text => formatDateTime(text),
    }, overrides);
  },
  duration(overrides) {
    return extend({
      width: '1%',
      className: 'text-nowrap',
      render: text => durationHumanize(text),
    }, overrides);
  },
  timeAgo(overrides) {
    return extend({
      width: '1%',
      className: 'text-nowrap',
      render: value => <TimeAgo date={value} />,
    }, overrides);
  },
  custom(render, overrides) {
    return extend({
      width: '1%',
      className: 'text-nowrap',
      render,
    }, overrides);
  },
};

Columns.dateTime.sortable = sortable;
Columns.duration.sortable = sortable;
Columns.timeAgo.sortable = sortable;
Columns.custom.sortable = sortable;

export default class ItemsTable extends React.Component {
  static propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    items: PropTypes.arrayOf(PropTypes.object),
    columns: PropTypes.arrayOf(PropTypes.shape({
      field: PropTypes.string, // data field
      orderByField: PropTypes.string, // field to order by (defaults to `field`)
      render: PropTypes.func, // (prop, item, context) => text | node; `prop` is `item[field]`
    })),
    onRowClick: PropTypes.func, // (event, item) => void
    // eslint-disable-next-line react/forbid-prop-types
    context: PropTypes.any, // any value that is passed to each column's `render` function

    orderByField: PropTypes.string,
    orderByReverse: PropTypes.bool,
    toggleSorting: PropTypes.func,
  };

  static defaultProps = {
    items: [],
    columns: [],
    onRowClick: null,
    context: null,

    orderByField: null,
    orderByReverse: false,
    toggleSorting: () => {},
  };

  prepareColumns() {
    const { orderByField, orderByReverse, toggleSorting } = this.props;
    const orderByDirection = orderByReverse ? 'descend' : 'ascend';

    return map(
      map(
        this.props.columns,
        column => extend(column, { orderByField: column.orderByField || column.field }),
      ),
      (column, index) => {
        // Bind click events only to sortable columns
        const onHeaderCell = column.sorter ? (
          () => ({ onClick: () => toggleSorting(column.orderByField) })
        ) : null;

        // Wrap render function to pass correct arguments
        const render = isFunction(column.render) ? (
          (text, row) => column.render(text, row.item, this.props.context)
        ) : identity;

        return extend(
          omit(column, ['field', 'orderByField', 'render']),
          {
            key: 'column' + index,
            dataIndex: 'item[' + JSON.stringify(column.field) + ']',
            defaultSortOrder: column.orderByField === orderByField ? orderByDirection : null,
            onHeaderCell,
            render,
          },
        );
      },
    );
  }

  render() {
    const columns = this.prepareColumns();
    const rows = map(
      this.props.items,
      (item, index) => ({ key: 'row' + index, item }),
    );

    // Bind events only if `onRowClick` specified
    const onTableRow = isFunction(this.props.onRowClick) ? (
      row => ({
        onClick: (event) => { this.props.onRowClick(event, row.item); },
      })
    ) : null;

    return (
      <Table
        className="table-data"
        columns={columns}
        dataSource={rows}
        rowKey={row => row.key}
        pagination={false}
        onRow={onTableRow}
      />
    );
  }
}
