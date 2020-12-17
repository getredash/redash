import React, { useEffect, useRef } from "react";
import cx from "classnames";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";
import Paginator from "@/components/Paginator";
import DynamicComponent from "@/components/DynamicComponent";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import useItemsListExtraActions from "@/components/items-list/hooks/useItemsListExtraActions";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { UrlStateStorage } from "@/components/items-list/classes/StateStorage";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import Layout from "@/components/layouts/ContentWithSidebar";
import { Query } from "@/services/query";
import { currentUser } from "@/services/auth";
import location from "@/services/location";
import routes from "@/services/routes";
import QueriesListEmptyState from "./QueriesListEmptyState";
import "./queries-list.css";
const sidebarMenu = [
    {
        key: "all",
        href: "queries",
        title: "All Queries",
    },
    {
        key: "favorites",
        href: "queries/favorites",
        title: "Favorites",
        icon: () => <Sidebar.MenuIcon icon="fa fa-star"/>,
    },
    {
        key: "my",
        href: "queries/my",
        title: "My Queries",
        // @ts-expect-error ts-migrate(2559) FIXME: Type '{ _isAdmin: undefined; canEdit(object: any):... Remove this comment to see the full error message
        icon: () => <Sidebar.ProfileImage user={currentUser}/>,
        isAvailable: () => currentUser.hasPermission("create_query"),
    },
    {
        key: "archive",
        href: "queries/archive",
        title: "Archived",
        icon: () => <Sidebar.MenuIcon icon="fa fa-archive"/>,
    },
];
const listColumns = [
    Columns.favorites({ className: "p-r-0" }),
    (Columns.custom as any).sortable((text: any, item: any) => (<React.Fragment>
        <Link className="table-main-title" href={"queries/" + item.id}>
          {item.name}
        </Link>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ className: string; tags: any; isDraft: any... Remove this comment to see the full error message */}
        <QueryTagsControl className="d-block" tags={item.tags} isDraft={item.is_draft} isArchived={item.is_archived}/>
      </React.Fragment>), {
        title: "Name",
        field: "name",
        width: null,
    }),
    Columns.custom((text: any, item: any) => item.user.name, { title: "Created By", width: "1%" }),
    (Columns.dateTime as any).sortable({ title: "Created At", field: "created_at", width: "1%" }),
    (Columns.dateTime as any).sortable({
        title: "Last Executed At",
        field: "retrieved_at",
        orderByField: "executed_at",
        width: "1%",
    }),
    (Columns.custom as any).sortable((text: any, item: any) => <SchedulePhrase schedule={item.schedule} isNew={item.isNew()}/>, {
        title: "Refresh Schedule",
        field: "schedule",
        width: "1%",
    }),
];
function QueriesListExtraActions(props: any) {
    return <DynamicComponent name="QueriesList.Actions" {...props}/>;
}
type QueriesListProps = {
    controller: ControllerType;
};
function QueriesList({ controller }: QueriesListProps) {
    const controllerRef = useRef();
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'ControllerType' is not assignable to type 'u... Remove this comment to see the full error message
    controllerRef.current = controller;
    useEffect(() => {
        const unlistenLocationChanges = location.listen((unused: any, action: any) => {
            // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
            const searchTerm = location.search.q || "";
            // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
            if (action === "PUSH" && searchTerm !== controllerRef.current.searchTerm) {
                // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
                controllerRef.current.updateSearch(searchTerm);
            }
        });
        return () => {
            unlistenLocationChanges();
        };
    }, []);
    const { areExtraActionsAvailable, listColumns: tableColumns, Component: ExtraActionsComponent, selectedItems, } = useItemsListExtraActions(controller, listColumns, QueriesListExtraActions);
    return (<div className="page-queries-list">
      <div className="container">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element | null' is not assignable to type 'n... Remove this comment to see the full error message */}
        <PageHeader title={controller.params.pageTitle} actions={currentUser.hasPermission("create_query") ? (<Link.Button block type="primary" href="queries/new">
                <i className="fa fa-plus m-r-5"/>
                New Query
              </Link.Button>) : null}/>
        {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
        <Layout>
          {/* @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message */}
          <Layout.Sidebar className="m-b-0">
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message */}
            <Sidebar.SearchInput placeholder="Search Queries..." value={controller.searchTerm} onChange={controller.updateSearch}/>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '({ key: string; href: string; title: string;... Remove this comment to see the full error message */}
            <Sidebar.Menu items={sidebarMenu} selected={controller.params.currentPage}/>
            <Sidebar.Tags url="api/queries/tags" onChange={controller.updateSelectedTags} showUnselectAll/>
          </Layout.Sidebar>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <Layout.Content>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message */}
            {controller.isLoaded && controller.isEmpty ? (<QueriesListEmptyState page={controller.params.currentPage} searchTerm={controller.searchTerm} selectedTags={controller.selectedTags}/>) : (<React.Fragment>
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
          </Layout.Content>
        </Layout>
      </div>
    </div>);
}
const QueriesListPage = itemsList(QueriesList, () => new ResourceItemsSource({
    getResource({ params: { currentPage } }: any) {
        // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
        return {
            all: (Query as any).query.bind(Query),
            my: (Query as any).myQueries.bind(Query),
            favorites: (Query as any).favorites.bind(Query),
            archive: (Query as any).archive.bind(Query),
        }[currentPage];
    },
    getItemProcessor() {
        return (item: any) => new Query(item);
    },
}), () => new UrlStateStorage({ orderByField: "created_at", orderByReverse: true }));
routes.register("Queries.List", routeWithUserSession({
    path: "/queries",
    title: "Queries",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <QueriesListPage {...pageProps} currentPage="all"/>,
}));
routes.register("Queries.Favorites", routeWithUserSession({
    path: "/queries/favorites",
    title: "Favorite Queries",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <QueriesListPage {...pageProps} currentPage="favorites"/>,
}));
routes.register("Queries.Archived", routeWithUserSession({
    path: "/queries/archive",
    title: "Archived Queries",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <QueriesListPage {...pageProps} currentPage="archive"/>,
}));
routes.register("Queries.My", routeWithUserSession({
    path: "/queries/my",
    title: "My Queries",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <QueriesListPage {...pageProps} currentPage="my"/>,
}));
