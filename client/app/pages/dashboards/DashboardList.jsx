import React from "react";

import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";
import Paginator from "@/components/Paginator";
import { DashboardTagsControl } from "@/components/tags-control/TagsControl";
import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { UrlStateStorage } from "@/components/items-list/classes/StateStorage";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import Layout from "@/components/layouts/ContentWithSidebar";

import { Dashboard } from "@/services/dashboard";
import { currentUser } from "@/services/auth";
import routes from "@/services/routes";

import DashboardListEmptyState from "./components/DashboardListEmptyState";

import "./dashboard-list.css";

class DashboardList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  sidebarMenu = [
    {
      key: "all",
      href: "dashboards",
      title: "All Dashboards",
    },
    {
      key: "favorites",
      href: "dashboards/favorites",
      title: "Favorites",
      icon: () => <Sidebar.MenuIcon icon="fa fa-star" />,
    },
  ];

  listColumns = [
    Columns.favorites({ className: "p-r-0" }),
    Columns.custom.sortable(
      (text, item) => (
        <React.Fragment>
          <Link className="table-main-title" href={item.url} data-test={`DashboardId${item.id}`}>
            {item.name}
          </Link>
          <DashboardTagsControl
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
    Columns.custom((text, item) => item.user.name, { title: "Created By", width: "1%" }),
    Columns.dateTime.sortable({
      title: "Created At",
      field: "created_at",
      width: "1%",
    }),
  ];

  render() {
    const { controller } = this.props;
    return (
      <div className="page-dashboard-list">
        <div className="container">
          <PageHeader
            title={controller.params.pageTitle}
            actions={
              currentUser.hasPermission("create_dashboard") ? (
                <Button block type="primary" onClick={() => CreateDashboardDialog.showModal()}>
                  <i className="fa fa-plus m-r-5" />
                  New Dashboard
                </Button>
              ) : null
            }
          />
          <Layout>
            <Layout.Sidebar className="m-b-0">
              <Sidebar.SearchInput
                placeholder="Search Dashboards..."
                value={controller.searchTerm}
                onChange={controller.updateSearch}
              />
              <Sidebar.Menu items={this.sidebarMenu} selected={controller.params.currentPage} />
              <Sidebar.Tags url="api/dashboards/tags" onChange={controller.updateSelectedTags} />
            </Layout.Sidebar>
            <Layout.Content>
              <div data-test="DashboardLayoutContent">
                {controller.isLoaded && controller.isEmpty ? (
                  <DashboardListEmptyState
                    page={controller.params.currentPage}
                    searchTerm={controller.searchTerm}
                    selectedTags={controller.selectedTags}
                  />
                ) : (
                  <div className="bg-white tiled table-responsive">
                    <ItemsTable
                      items={controller.pageItems}
                      loading={!controller.isLoaded}
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
              </div>
            </Layout.Content>
          </Layout>
        </div>
      </div>
    );
  }
}

const DashboardListPage = itemsList(
  DashboardList,
  () =>
    new ResourceItemsSource({
      getResource({ params: { currentPage } }) {
        return {
          all: Dashboard.query.bind(Dashboard),
          favorites: Dashboard.favorites.bind(Dashboard),
        }[currentPage];
      },
      getItemProcessor() {
        return item => new Dashboard(item);
      },
    }),
  () => new UrlStateStorage({ orderByField: "created_at", orderByReverse: true })
);

routes.register(
  "Dashboards.List",
  routeWithUserSession({
    path: "/dashboards",
    title: "Dashboards",
    render: pageProps => <DashboardListPage {...pageProps} currentPage="all" />,
  })
);
routes.register(
  "Dashboards.Favorites",
  routeWithUserSession({
    path: "/dashboards/favorites",
    title: "Favorite Dashboards",
    render: pageProps => <DashboardListPage {...pageProps} currentPage="favorites" />,
  })
);
