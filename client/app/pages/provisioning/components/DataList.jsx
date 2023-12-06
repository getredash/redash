import React, { useEffect, useRef } from "react";
import cx from "classnames";

import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";
import Paginator from "@/components/Paginator";
import DynamicComponent from "@/components/DynamicComponent";
import { QueryTagsControl } from "@/components/tags-control/TagsControl";
import SchedulePhrase from "@/components/queries/SchedulePhrase";
import { ControllerType } from "@/components/items-list/ItemsList";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import Layout from "@/components/layouts/ContentWithSidebar";

import { currentUser } from "@/services/auth";
import location from "@/services/location";


import "./data-list.css";

const listColumns = [
  Columns.favorites({ className: "p-r-0" }),
  Columns.custom.sortable(
    (text, item) => (
      <React.Fragment>
        <Link className="table-main-title" href={"queries/" + item.id}>
          {item.name}
        </Link>
        <QueryTagsControl className="d-block" tags={item.tags} isDraft={item.is_draft} isArchived={item.is_archived} />
      </React.Fragment>
    ),
    {
      title: "Name",
      field: "name",
      width: null,
    }
  ),
  Columns.custom((text, item) => item.user.name, { title: "Created By", width: "1%" }),
  Columns.dateTime.sortable({ title: "Created At", field: "created_at", width: "1%" }),
  Columns.dateTime.sortable({
    title: "Last Executed At",
    field: "retrieved_at",
    orderByField: "executed_at",
    width: "1%",
  }),
  Columns.custom.sortable((text, item) => <SchedulePhrase schedule={item.schedule} isNew={item.isNew()} />, {
    title: "Refresh Schedule",
    field: "schedule",
    width: "1%",
  }),
];

function QueriesListExtraActions(props) {
  return <DynamicComponent name="QueriesList.Actions" {...props} />;
}

function QueriesList({ controller }) {
  const controllerRef = useRef();
  controllerRef.current = controller;

  useEffect(() => {
    const unlistenLocationChanges = location.listen((unused, action) => {
      const searchTerm = location.search.q || "";
      if (action === "PUSH" && searchTerm !== controllerRef.current.searchTerm) {
        controllerRef.current.updateSearch(searchTerm);
      }
    });

    return () => {
      unlistenLocationChanges();
    };
  }, []);

  const {
    areExtraActionsAvailable,
    listColumns: tableColumns,
    Component: ExtraActionsComponent,
    selectedItems,
  } = useItemsListExtraActions(controller, listColumns, QueriesListExtraActions);

  return (
    <div className="page-queries-list">
      <div className="container">
        <PageHeader
          title={controller.params.pageTitle}
          actions={
            currentUser.hasPermission("create_query") ? (
              <Link.Button block type="primary" href="queries/new">
                <i className="fa fa-plus m-r-5" aria-hidden="true" />
                New Query
              </Link.Button>
            ) : null
          }
        />
        <Layout>
          <Layout.Content>
            {controller.isLoaded && controller.isEmpty  (
              <React.Fragment>
                <div className={cx({ "m-b-10": areExtraActionsAvailable })}>
                  <ExtraActionsComponent selectedItems={selectedItems} />
                </div>
                <div className="bg-white tiled table-responsive">
                  <ItemsTable
                    items={controller.pageItems}
                    loading={!controller.isLoaded}
                    columns={tableColumns}
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
              </React.Fragment>
            )}
          </Layout.Content>
        </Layout>
      </div>
    </div>
  );
}

QueriesList.propTypes = {
  controller: ControllerType.isRequired,
};