import { isFunction, map, filter, extend, omit, identity } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Table from "antd/lib/table";
import FavoritesControl from "@/components/FavoritesControl";
import TimeAgo from "@/components/TimeAgo";
import { durationHumanize, formatDate, formatDateTime } from "@/lib/utils";

// `this` refers to previous function in the chain (`Columns.***`).
// Adds `sorter: true` field to column definition
function sortable(...args) {
  return extend(this(...args), { sorter: true });
}

export const Columns = {
  favorites(overrides) {
    return extend(
      {
        width: "1%",
        render: (text, item) => <FavoritesControl item={item} />,
      },
      overrides
    );
  },
  avatar(overrides, formatTitle) {
    formatTitle = isFunction(formatTitle) ? formatTitle : identity;
    return extend(
      {
        width: "1%",
        render: (user, item) => (
          <img
            src={item.user.profile_image_url}
            className="profile__image_thumb"
            alt={formatTitle(user.name, item)}
            title={formatTitle(user.name, item)}
          />
        ),
      },
      overrides
    );
  },
  date(overrides) {
    return extend(
      {
        render: text => formatDate(text),
      },
      overrides
    );
  },
  dateTime(overrides) {
    return extend(
      {
        render: text => formatDateTime(text),
      },
      overrides
    );
  },
  duration(overrides) {
    return extend(
      {
        width: "1%",
        className: "text-nowrap",
        render: text => durationHumanize(text),
      },
      overrides
    );
  },
  timeAgo(overrides) {
    return extend(
      {
        render: value => <TimeAgo date={value} />,
      },
      overrides
    );
  },
  custom(render, overrides) {
    return extend(
      {
        render,
      },
      overrides
    );
  },
};

Columns.date.sortable = sortable;
Columns.dateTime.sortable = sortable;
Columns.duration.sortable = sortable;
Columns.timeAgo.sortable = sortable;
Columns.custom.sortable = sortable;

export default class ItemsTable extends React.Component {
  static propTypes = {
    loading: PropTypes.bool,
    // eslint-disable-next-line react/forbid-prop-types
    items: PropTypes.arrayOf(PropTypes.object),
    columns: PropTypes.arrayOf(
      PropTypes.shape({
        field: PropTypes.string, // data field
        orderByField: PropTypes.string, // field to order by (defaults to `field`)
        render: PropTypes.func, // (prop, item) => text | node; `prop` is `item[field]`
        isAvailable: PropTypes.func, // return `true` to show column and `false` to hide; if omitted: show column
      })
    ),
    showHeader: PropTypes.bool,
    onRowClick: PropTypes.func, // (event, item) => void

    orderByField: PropTypes.string,
    orderByReverse: PropTypes.bool,
    toggleSorting: PropTypes.func,
  };

  static defaultProps = {
    loading: false,
    items: [],
    columns: [],
    showHeader: true,
    onRowClick: null,

    orderByField: null,
    orderByReverse: false,
    toggleSorting: () => {},
  };

  prepareColumns() {
    const { orderByField, orderByReverse, toggleSorting } = this.props;
    const orderByDirection = orderByReverse ? "descend" : "ascend";

    return map(
      map(
        filter(this.props.columns, column => (isFunction(column.isAvailable) ? column.isAvailable() : true)),
        column => extend(column, { orderByField: column.orderByField || column.field })
      ),
      (column, index) => {
        // Bind click events only to sortable columns
        const onHeaderCell = column.sorter ? () => ({ onClick: () => toggleSorting(column.orderByField) }) : null;

        // Wrap render function to pass correct arguments
        const render = isFunction(column.render) ? (text, row) => column.render(text, row.item) : identity;

        return extend(omit(column, ["field", "orderByField", "render"]), {
          key: "column" + index,
          dataIndex: "item[" + JSON.stringify(column.field) + "]",
          defaultSortOrder: column.orderByField === orderByField ? orderByDirection : null,
          onHeaderCell,
          render,
        });
      }
    );
  }

  render() {
    const columns = this.prepareColumns();
    const rows = map(this.props.items, (item, index) => ({ key: "row" + index, item }));

    // Bind events only if `onRowClick` specified
    const onTableRow = isFunction(this.props.onRowClick)
      ? row => ({
          onClick: event => {
            this.props.onRowClick(event, row.item);
          },
        })
      : null;

    const { showHeader } = this.props;

    return (
      <Table
        className={classNames("table-data", { "ant-table-headerless": !showHeader })}
        loading={this.props.loading}
        columns={columns}
        showHeader={showHeader}
        dataSource={rows}
        rowKey={row => row.key}
        pagination={false}
        onRow={onTableRow}
      />
    );
  }
}
