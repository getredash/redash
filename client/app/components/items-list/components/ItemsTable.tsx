import { isFunction, map, filter, extend, omit, identity, range, isEmpty } from "lodash";
import React from "react";
import classNames from "classnames";
import Table from "antd/lib/table";
import Skeleton from "antd/lib/skeleton";
import FavoritesControl from "@/components/FavoritesControl";
import TimeAgo from "@/components/TimeAgo";
import { durationHumanize, formatDate, formatDateTime } from "@/lib/utils";

// `this` refers to previous function in the chain (`Columns.***`).
// Adds `sorter: true` field to column definition
// @ts-expect-error ts-migrate(7019) FIXME: Rest parameter 'args' implicitly has an 'any[]' ty... Remove this comment to see the full error message
function sortable(...args) {
  // @ts-expect-error ts-migrate(2683) FIXME: 'this' implicitly has type 'any' because it does n... Remove this comment to see the full error message
  return extend(this(...args), { sorter: true });
}

export const Columns = {
  favorites(overrides: any) {
    return extend(
      {
        width: "1%",
        render: (text: any, item: any) => <FavoritesControl item={item} />,
      },
      overrides
    );
  },
  avatar(overrides: any, formatTitle: any) {
    formatTitle = isFunction(formatTitle) ? formatTitle : identity;
    return extend(
      {
        width: "1%",
        render: (user: any, item: any) => (
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
  date(overrides: any) {
    return extend(
      {
        render: (text: any) => formatDate(text),
      },
      overrides
    );
  },
  dateTime(overrides: any) {
    return extend(
      {
        render: (text: any) => formatDateTime(text),
      },
      overrides
    );
  },
  duration(overrides: any) {
    return extend(
      {
        width: "1%",
        className: "text-nowrap",
        render: (text: any) => durationHumanize(text),
      },
      overrides
    );
  },
  timeAgo(overrides: any, timeAgoCustomProps = undefined) {
    return extend(
      {
        render: (value: any) => <TimeAgo date={value} {...timeAgoCustomProps} />,
      },
      overrides
    );
  },
  custom(render: any, overrides: any) {
    return extend(
      {
        render,
      },
      overrides
    );
  },
};

// @ts-expect-error ts-migrate(2339) FIXME: Property 'sortable' does not exist on type '(overr... Remove this comment to see the full error message
Columns.date.sortable = sortable;
// @ts-expect-error ts-migrate(2339) FIXME: Property 'sortable' does not exist on type '(overr... Remove this comment to see the full error message
Columns.dateTime.sortable = sortable;
// @ts-expect-error ts-migrate(2339) FIXME: Property 'sortable' does not exist on type '(overr... Remove this comment to see the full error message
Columns.duration.sortable = sortable;
// @ts-expect-error ts-migrate(2339) FIXME: Property 'sortable' does not exist on type '(overr... Remove this comment to see the full error message
Columns.timeAgo.sortable = sortable;
// @ts-expect-error ts-migrate(2339) FIXME: Property 'sortable' does not exist on type '(rende... Remove this comment to see the full error message
Columns.custom.sortable = sortable;

type OwnProps = {
    loading?: boolean;
    items?: any[];
    columns?: {
        field?: string;
        orderByField?: string;
        render?: (...args: any[]) => any;
        isAvailable?: (...args: any[]) => any;
    }[];
    showHeader?: boolean;
    onRowClick?: (...args: any[]) => any;
    orderByField?: string;
    orderByReverse?: boolean;
    toggleSorting?: (...args: any[]) => any;
    "data-test"?: string;
    rowKey?: string | ((...args: any[]) => any);
};

type Props = OwnProps & typeof ItemsTable.defaultProps;

export default class ItemsTable extends React.Component<Props> {

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
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'columns' does not exist on type 'never'.
        filter(this.props.columns, column => (isFunction(column.isAvailable) ? column.isAvailable() : true)),
        column => extend(column, { orderByField: column.orderByField || column.field })
      ),
      (column, index) => {
        // Bind click events only to sortable columns
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        const onHeaderCell = column.sorter ? () => ({ onClick: () => toggleSorting(column.orderByField) }) : null;

        // Wrap render function to pass correct arguments
        const render = isFunction(column.render) ? (text: any, row: any) => column.render(text, row.item) : identity;

        return extend(omit(column, ["field", "orderByField", "render"]), {
          key: "column" + index,
          dataIndex: ["item", column.field],
          defaultSortOrder: column.orderByField === orderByField ? orderByDirection : null,
          onHeaderCell,
          render,
        });
      }
    );
  }

  getRowKey = (record: any) => {
    const { rowKey } = this.props;
    if (rowKey) {
      if (isFunction(rowKey)) {
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        return rowKey(record.item);
      }
      return record.item[rowKey];
    }
    return record.key;
  };

  render() {
    const tableDataProps = {
      columns: this.prepareColumns(),
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'items' does not exist on type 'never'.
      dataSource: map(this.props.items, (item, index) => ({ key: "row" + index, item })),
    };

    // Bind events only if `onRowClick` specified
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onRowClick' does not exist on type 'neve... Remove this comment to see the full error message
    const onTableRow = isFunction(this.props.onRowClick)
      ? (row: any) => ({
      onClick: (event: any) => {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'onRowClick' does not exist on type 'neve... Remove this comment to see the full error message
        this.props.onRowClick(event, row.item);
      }
    })
      : null;

    const { showHeader } = this.props;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'loading' does not exist on type 'never'.
    if (this.props.loading) {
      if (isEmpty(tableDataProps.dataSource)) {
        tableDataProps.columns = tableDataProps.columns.map(column => ({
          ...column,
          sorter: false,
          render: () => <Skeleton active paragraph={false} />,
        }));
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ key: string; }[]' is not assignable to typ... Remove this comment to see the full error message
        tableDataProps.dataSource = range(10).map(key => ({ key: `${key}` }));
      } else {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'loading' does not exist on type '{ colum... Remove this comment to see the full error message
        tableDataProps.loading = { indicator: null };
      }
    }

    return (
      <Table
        className={classNames("table-data", { "ant-table-headerless": !showHeader })}
        showHeader={showHeader}
        rowKey={this.getRowKey}
        pagination={false}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '((row: any) => { onClick: (event: any) => vo... Remove this comment to see the full error message
        onRow={onTableRow}
        data-test={this.props["data-test"]}
        {...tableDataProps}
      />
    );
  }
}
