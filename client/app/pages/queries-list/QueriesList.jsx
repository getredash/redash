import React from "react";
import { react2angular } from "react2angular";

import PageHeader from "@/components/PageHeader";
import Paginator from "@/components/Paginator";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import SchedulePhrase from "@/components/queries/SchedulePhrase";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { UrlStateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";

import Layout from "@/components/layouts/ContentWithSidebar";

import { Query } from "@/services/query";
import { currentUser } from "@/services/auth";
import { routesToAngularRoutes } from "@/lib/utils";

import QueriesListEmptyState from "./QueriesListEmptyState";

import "./queries-list.css";

class QueriesList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  sidebarMenu = [
    {
      key: "all",
      href: "queries",
      title: "All Queries",
    },
    {
      key: "favorites",
      href: "queries/favorites",
      title: "Favorites",
      icon: () => <Sidebar.MenuIcon icon="fa fa-star" />,
    },
    {
      key: "archive",
      href: "queries/archive",
      title: "Archived",
      icon: () => <Sidebar.MenuIcon icon="fa fa-archive" />,
    },
    {
      key: "my",
      href: "queries/my",
      title: "My Queries",
      icon: () => <Sidebar.ProfileImage user={currentUser} />,
      isAvailable: () => currentUser.hasPermission("create_query"),
    },
  ];

  listColumns = [
    Columns.favorites({ className: "p-r-0" }),
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

  render() {
    const { controller } = this.props;
    return (
      <div className="container">
        <PageHeader title={controller.params.title} />
        <Layout className="m-l-15 m-r-15">
          <Layout.Sidebar className="m-b-0">
            <Sidebar.SearchInput
              placeholder="Search Queries..."
              value={controller.searchTerm}
              onChange={controller.updateSearch}
            />
            <Sidebar.Menu items={this.sidebarMenu} selected={controller.params.currentPage} />
            <Sidebar.Tags url="api/queries/tags" onChange={controller.updateSelectedTags} />
            <Sidebar.PageSizeSelect
              className="m-b-10"
              options={controller.pageSizeOptions}
              value={controller.itemsPerPage}
              onChange={itemsPerPage => controller.updatePagination({ itemsPerPage })}
            />
          </Layout.Sidebar>
          <Layout.Content>
            {!controller.isLoaded && <LoadingState />}
            {controller.isLoaded && controller.isEmpty && (
              <QueriesListEmptyState
                page={controller.params.currentPage}
                searchTerm={controller.searchTerm}
                selectedTags={controller.selectedTags}
              />
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
          </Layout.Content>
        </Layout>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component(
    "pageQueriesList",
    react2angular(
      itemsList(
        QueriesList,
        new ResourceItemsSource({
          getResource({ params: { currentPage } }) {
            return {
              all: Query.query.bind(Query),
              my: Query.myQueries.bind(Query),
              favorites: Query.favorites.bind(Query),
              archive: Query.archive.bind(Query),
            }[currentPage];
          },
          getItemProcessor() {
            return item => new Query(item);
          },
        }),
        new UrlStateStorage({ orderByField: "created_at", orderByReverse: true })
      )
    )
  );

  return routesToAngularRoutes(
    [
      {
        path: "/queries",
        title: "Queries",
        key: "all",
      },
      {
        path: "/queries/favorites",
        title: "Favorite Queries",
        key: "favorites",
      },
      {
        path: "/queries/archive",
        title: "Archived Queries",
        key: "archive",
      },
      {
        path: "/queries/my",
        title: "My Queries",
        key: "my",
      },
    ],
    {
      reloadOnSearch: false,
      template: '<page-queries-list on-error="handleError"></page-queries-list>',
      controller($scope, $exceptionHandler) {
        "ngInject";

        $scope.handleError = $exceptionHandler;
      },
    }
  );
}

init.init = true;
