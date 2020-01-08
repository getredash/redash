import { map } from "lodash";
import React from "react";
import { react2angular } from "react2angular";

import Switch from "antd/lib/switch";
import * as Grid from "antd/lib/grid";
import Paginator from "@/components/Paginator";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import TimeAgo from "@/components/TimeAgo";
import Layout from "@/components/admin/Layout";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import { PageSizeSelect } from "@/components/items-list/components/Sidebar";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";

import { $http } from "@/services/ng";
import { Query } from "@/services/query";
import recordEvent from "@/services/recordEvent";
import { routesToAngularRoutes } from "@/lib/utils";

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
          <a className="table-main-title" href={"queries/" + item.id}>
            {item.name}
          </a>
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
        <Grid.Row className="m-15">
          <Grid.Col span={16}>
            <div>
              <label htmlFor="auto-update-switch" className="m-0">
                Auto update
              </label>
              <Switch
                id="auto-update-switch"
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
          </Grid.Col>
          <Grid.Col span={8}>
            {controller.isLoaded && !controller.isEmpty && (
              <PageSizeSelect
                options={controller.pageSizeOptions}
                value={controller.itemsPerPage}
                onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
              />
            )}
          </Grid.Col>
        </Grid.Row>
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
              totalCount={controller.totalItemsCount}
              itemsPerPage={controller.itemsPerPage}
              page={controller.page}
              onChange={page => controller.updatePagination({ page })}
            />
          </div>
        )}
      </Layout>
    );
  }
}

export default function init(ngModule) {
  ngModule.component(
    "pageOutdatedQueries",
    react2angular(
      itemsList(
        OutdatedQueries,
        new ItemsSource({
          doRequest(request, context) {
            return (
              $http
                .get("/api/admin/queries/outdated")
                // eslint-disable-next-line camelcase
                .then(({ data: { queries, updated_at } }) => {
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
        new StateStorage({ orderByField: "created_at", orderByReverse: true })
      )
    )
  );

  return routesToAngularRoutes(
    [
      {
        path: "/admin/queries/outdated",
        title: "Outdated Queries",
        key: "outdated_queries",
      },
    ],
    {
      template: '<page-outdated-queries on-error="handleError"></page-outdated-queries>',
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
