import { map, uniqueId } from "lodash";
import React from "react";

import Switch from "antd/lib/switch";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Link from "@/components/Link";
import Paginator from "@/components/Paginator";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import TimeAgo from "@/components/TimeAgo";
import Layout from "@/components/admin/Layout";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";

import { axios } from "@/services/axios";
import { Query } from "@/services/query";
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";

class OutdatedQueries extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    {
      title: "ID",
      field: "id",
      width: "1%",
      align: "right",
      sorter: true,
    },
    Columns.custom.sortable(
      (text, item) => (
        <React.Fragment>
          <Link className="table-main-title" href={"queries/" + item.id}>
            {item.name}
          </Link>
          <QueryTagsControl
            className="d-block"
            tags={item.tags}
            isDraft={item.is_draft}
            isArchived={item.is_archived}
          />
        </React.Fragment>
      ),
      {
        title: "Name",
        field: "name",
        width: null,
      }
    ),
    Columns.avatar({ field: "user", className: "p-l-0 p-r-0" }, name => `Created by ${name}`),
    Columns.dateTime.sortable({ title: "Created At", field: "created_at" }),
    Columns.duration.sortable({ title: "Runtime", field: "runtime" }),
    Columns.dateTime.sortable({ title: "Last Executed At", field: "retrieved_at", orderByField: "executed_at" }),
    Columns.custom.sortable((text, item) => <SchedulePhrase schedule={item.schedule} isNew={item.isNew()} />, {
      title: "Update Schedule",
      field: "schedule",
    }),
  ];

  state = {
    autoUpdate: true,
  };

  _updateTimer = null;
  autoUpdateSwitchId = uniqueId("auto-update-switch");

  componentDidMount() {
    recordEvent("view", "page", "admin/queries/outdated");
    this.update(true);
  }

  componentWillUnmount() {
    clearTimeout(this._updateTimer);
  }

  update = (isInitialCall = false) => {
    if (!isInitialCall && this.state.autoUpdate) {
      this.props.controller.update();
    }
    this._updateTimer = setTimeout(this.update, 60 * 1000);
  };

  render() {
    const { controller } = this.props;
    return (
      <Layout activeTab={controller.params.currentPage}>
        <div className="m-15">
          <div>
            <label htmlFor={this.autoUpdateSwitchId} className="m-0">
              Auto update
            </label>
            <Switch
              id={this.autoUpdateSwitchId}
              className="m-l-10"
              checked={this.state.autoUpdate}
              onChange={autoUpdate => this.setState({ autoUpdate })}
            />
          </div>
          {controller.params.lastUpdatedAt && (
            <div className="m-t-5">
              Last updated: <TimeAgo date={controller.params.lastUpdatedAt * 1000} />
            </div>
          )}
        </div>
        {!controller.isLoaded && <LoadingState />}
        {controller.isLoaded && controller.isEmpty && (
          <div className="text-center p-15">There are no outdated queries.</div>
        )}
        {controller.isLoaded && !controller.isEmpty && (
          <div className="bg-white tiled table-responsive">
            <ItemsTable
              items={controller.pageItems}
              columns={this.listColumns}
              orderByField={controller.orderByField}
              orderByReverse={controller.orderByReverse}
              toggleSorting={controller.toggleSorting}
            />
            <Paginator
              showPageSizeSelect
              totalCount={controller.totalItemsCount}
              pageSize={controller.itemsPerPage}
              onPageSizeChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
              page={controller.page}
              onChange={page => controller.updatePagination({ page })}
            />
          </div>
        )}
      </Layout>
    );
  }
}

const OutdatedQueriesPage = itemsList(
  OutdatedQueries,
  () =>
    new ItemsSource({
      doRequest(request, context) {
        return (
          axios
            .get("/api/admin/queries/outdated")
            // eslint-disable-next-line camelcase
            .then(({ queries, updated_at }) => {
              context.setCustomParams({ lastUpdatedAt: parseFloat(updated_at) });
              return queries;
            })
        );
      },
      processResults(items) {
        return map(items, item => new Query(item));
      },
      isPlainList: true,
    }),
  () => new StateStorage({ orderByField: "created_at", orderByReverse: true })
);

routes.register(
  "Admin.OutdatedQueries",
  routeWithUserSession({
    path: "/admin/queries/outdated",
    title: "Outdated Queries",
    render: pageProps => <OutdatedQueriesPage {...pageProps} currentPage="outdated_queries" />,
  })
);
