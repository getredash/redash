import React from "react";
import cx from "classnames";
import Button from "antd/lib/button";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";
import Paginator from "@/components/Paginator";
import DynamicComponent from "@/components/DynamicComponent";
import { DashboardTagsControl } from "@/components/tags-control/TagsControl";
import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { UrlStateStorage } from "@/components/items-list/classes/StateStorage";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import useItemsListExtraActions from "@/components/items-list/hooks/useItemsListExtraActions";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import Layout from "@/components/layouts/ContentWithSidebar";
import { Dashboard } from "@/services/dashboard";
import { currentUser } from "@/services/auth";
import routes from "@/services/routes";
import DashboardListEmptyState from "./components/DashboardListEmptyState";
import "./dashboard-list.css";
const sidebarMenu = [
    {
        key: "all",
        href: "dashboards",
        title: "All Dashboards",
    },
    {
        key: "favorites",
        href: "dashboards/favorites",
        title: "Favorites",
        icon: () => <Sidebar.MenuIcon icon="fa fa-star"/>,
    },
];
const listColumns = [
    Columns.favorites({ className: "p-r-0" }),
    (Columns.custom as any).sortable((text: any, item: any) => (<React.Fragment>
        <Link className="table-main-title" href={item.url} data-test={`DashboardId${item.id}`}>
          {item.name}
        </Link>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ className: string; tags: any; isDraft: any... Remove this comment to see the full error message */}
        <DashboardTagsControl className="d-block" tags={item.tags} isDraft={item.is_draft} isArchived={item.is_archived}/>
      </React.Fragment>), {
        title: "Name",
        field: "name",
        width: null,
    }),
    Columns.custom((text: any, item: any) => item.user.name, { title: "Created By", width: "1%" }),
    (Columns.dateTime as any).sortable({
        title: "Created At",
        field: "created_at",
        width: "1%",
    }),
];
function DashboardListExtraActions(props: any) {
    return <DynamicComponent name="DashboardList.Actions" {...props}/>;
}
type DashboardListProps = {
    controller: ControllerType;
};
function DashboardList({ controller }: DashboardListProps) {
    const { areExtraActionsAvailable, listColumns: tableColumns, Component: ExtraActionsComponent, selectedItems, } = useItemsListExtraActions(controller, listColumns, DashboardListExtraActions);
    return (<div className="page-dashboard-list">
      <div className="container">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element | null' is not assignable to type 'n... Remove this comment to see the full error message */}
        <PageHeader title={controller.params.pageTitle} actions={currentUser.hasPermission("create_dashboard") ? (<Button block type="primary" onClick={() => CreateDashboardDialog.showModal()}>
                <i className="fa fa-plus m-r-5"/>
                New Dashboard
              </Button>) : null}/>
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Layout>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Layout.Sidebar className="m-b-0">
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message */}
            <Sidebar.SearchInput placeholder="Search Dashboards..." value={controller.searchTerm} onChange={controller.updateSearch}/>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '({ key: string; href: string; title: string;... Remove this comment to see the full error message */}
            <Sidebar.Menu items={sidebarMenu} selected={controller.params.currentPage}/>
            <Sidebar.Tags url="api/dashboards/tags" onChange={controller.updateSelectedTags} showUnselectAll/>
          </Layout.Sidebar>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Layout.Content>
            <div data-test="DashboardLayoutContent">
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message */}
              {controller.isLoaded && controller.isEmpty ? (<DashboardListEmptyState page={controller.params.currentPage} searchTerm={controller.searchTerm} selectedTags={controller.selectedTags}/>) : (<React.Fragment>
                  <div className={cx({ "m-b-10": areExtraActionsAvailable })}>
                    <ExtraActionsComponent selectedItems={selectedItems}/>
                  </div>
                  <div className="bg-white tiled table-responsive">
                    {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
                    <ItemsTable items={controller.pageItems} loading={!controller.isLoaded} columns={tableColumns} orderByField={controller.orderByField} orderByReverse={controller.orderByReverse} toggleSorting={controller.toggleSorting}/>
                    {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(itemsPerPage: any) => any' is not assignabl... Remove this comment to see the full error message */}
                    <Paginator showPageSizeSelect totalCount={controller.totalItemsCount} pageSize={controller.itemsPerPage} onPageSizeChange={(itemsPerPage: any) => controller.updatePagination({ itemsPerPage })} page={controller.page} onChange={(page: any) => controller.updatePagination({ page })}/>
                  </div>
                </React.Fragment>)}
            </div>
          </Layout.Content>
        </Layout>
      </div>
    </div>);
}
const DashboardListPage = itemsList(DashboardList, () => new ResourceItemsSource({
    getResource({ params: { currentPage } }: any) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return {
            all: (Dashboard as any).query.bind(Dashboard),
            favorites: (Dashboard as any).favorites.bind(Dashboard),
        }[currentPage];
    },
    getItemProcessor() {
        // @ts-expect-error ts-migrate(7009) FIXME: 'new' expression, whose target lacks a construct s... Remove this comment to see the full error message
        return (item: any) => new Dashboard(item);
    },
}), () => new UrlStateStorage({ orderByField: "created_at", orderByReverse: true }));
routes.register("Dashboards.List", routeWithUserSession({
    path: "/dashboards",
    title: "Dashboards",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <DashboardListPage {...pageProps} currentPage="all"/>,
}));
routes.register("Dashboards.Favorites", routeWithUserSession({
    path: "/dashboards/favorites",
    title: "Favorite Dashboards",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <DashboardListPage {...pageProps} currentPage="favorites"/>,
}));
