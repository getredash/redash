import { isFunction, map, filter, extend, omit, identity, range, isEmpty } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Table from "antd/lib/table";
import Skeleton from "antd/lib/skeleton";
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
        render: (text) => formatDate(text),
      },
      overrides
    );
  },
  dateTime(overrides) {
    return extend(
      {
        render: (text) => formatDateTime(text),
      },
      overrides
    );
  },
  duration(overrides) {
    return extend(
      {
        width: "1%",
        className: "text-nowrap",
        render: (text) => durationHumanize(text),
      },
      overrides
    );
  },
  timeAgo(overrides, timeAgoCustomProps = undefined) {
    return extend(
      {
        render: (value) => <TimeAgo date={value} {...timeAgoCustomProps} />,
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
    setSorting: PropTypes.func,
    "data-test": PropTypes.string,
    rowKey: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
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
    const { orderByField, orderByReverse } = this.props;
    const orderByDirection = orderByReverse ? "descend" : "ascend";

    return map(
      map(
        filter(this.props.columns, (column) => (isFunction(column.isAvailable) ? column.isAvailable() : true)),
        (column) => extend(column, { orderByField: column.orderByField || column.field })
      ),
      (column, index) => {
        // Wrap render function to pass correct arguments
        const render = isFunction(column.render) ? (text, row) => column.render(text, row.item) : identity;

        return extend(omit(column, ["field", "orderByField", "render"]), {
          key: "column" + index,
          dataIndex: ["item", column.field],
          defaultSortOrder: column.orderByField === orderByField ? orderByDirection : null,
          render,
        });
      }
    );
  }

  getRowKey = (record) => {
    const { rowKey } = this.props;
    if (rowKey) {
      if (isFunction(rowKey)) {
        return rowKey(record.item);
      }
      return record.item[rowKey];
    }
    return record.key;
  };

  render() {
    const tableDataProps = {
      columns: this.prepareColumns(),
      dataSource: map(this.props.items, (item, index) => ({ key: "row" + index, item })),
    };

    // Bind events only if `onRowClick` specified
    const onTableRow = isFunction(this.props.onRowClick)
      ? (row) => ({
          onClick: (event) => {
            this.props.onRowClick(event, row.item);
          },
        })
      : null;

    const onChange = (pagination, filters, sorter, extra) => {
      const action = extra?.action;
      if (action === "sort") {
        const propsColumn = this.props.columns.find((column) => column.field === sorter.field[1]);
        if (!propsColumn.sorter) {
          return;
        }
        let orderByField = propsColumn.orderByField;
        const orderByReverse = sorter.order === "descend";

        if (orderByReverse === undefined) {
          orderByField = null;
        }
        if (this.props.setSorting) {
          this.props.setSorting(orderByField, orderByReverse);
        } else {
          this.props.toggleSorting(orderByField);
        }
      }
    };

    const { showHeader } = this.props;
    if (this.props.loading) {
      if (isEmpty(tableDataProps.dataSource)) {
        tableDataProps.columns = tableDataProps.columns.map((column) => ({
          ...column,
          sorter: false,
          render: () => <Skeleton active paragraph={false} />,
        }));
        tableDataProps.dataSource = range(10).map((key) => ({ key: `${key}` }));
      } else {
        tableDataProps.loading = { indicator: null };
      }
    }

    return (
      <Table
        className={classNames("table-data", { "ant-table-headerless": !showHeader })}
        showHeader={showHeader}
        rowKey={this.getRowKey}
        pagination={false}
        onRow={onTableRow}
        onChange={onChange}
        data-test={this.props["data-test"]}
        {...tableDataProps}
      />
    );
  }
}
