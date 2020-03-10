import { get } from "lodash";
import React from "react";

import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import Paginator from "@/components/Paginator";
import QuerySnippetDialog from "@/components/query-snippets/QuerySnippetDialog";

import { wrap as itemsList, ControllerType } from "@/components/items-list/ItemsList";
import { ResourceItemsSource } from "@/components/items-list/classes/ItemsSource";
import { StateStorage } from "@/components/items-list/classes/StateStorage";

import LoadingState from "@/components/items-list/components/LoadingState";
import ItemsTable, { Columns } from "@/components/items-list/components/ItemsTable";
import wrapSettingsTab from "@/components/SettingsWrapper";

import QuerySnippet from "@/services/query-snippet";
import { currentUser } from "@/services/auth";
import { policy } from "@/services/policy";
import notification from "@/services/notification";
import "./QuerySnippetsList.less";

const canEditQuerySnippet = querySnippet => currentUser.isAdmin || currentUser.id === get(querySnippet, "user.id");

class QuerySnippetsList extends React.Component {
  static propTypes = {
    controller: ControllerType.isRequired,
  };

  listColumns = [
    Columns.custom.sortable(
      (text, querySnippet) => (
        <div>
          <a className="table-main-title clickable" onClick={() => this.showSnippetDialog(querySnippet)}>
            {querySnippet.trigger}
          </a>
        </div>
      ),
      {
        title: "Trigger",
        field: "trigger",
        className: "text-nowrap",
      }
    ),
    Columns.custom.sortable(text => text, {
      title: "Description",
      field: "description",
      className: "text-nowrap",
    }),
    Columns.custom(snippet => <code className="snippet-content">{snippet}</code>, {
      title: "Snippet",
      field: "snippet",
    }),
    Columns.avatar({ field: "user", className: "p-l-0 p-r-0" }, name => `Created by ${name}`),
    Columns.date.sortable({
      title: "Created At",
      field: "created_at",
      className: "text-nowrap",
      width: "1%",
    }),
    Columns.custom(
      (text, querySnippet) =>
        canEditQuerySnippet(querySnippet) && (
          <Button type="danger" className="w-100" onClick={e => this.deleteQuerySnippet(e, querySnippet)}>
            Delete
          </Button>
        ),
      {
        width: "1%",
      }
    ),
  ];

  componentDidMount() {
    const { isNewOrEditPage, querySnippetId } = this.props.controller.params;

    if (isNewOrEditPage) {
      if (querySnippetId === "new") {
        if (policy.isCreateQuerySnippetEnabled()) {
          this.showSnippetDialog();
        } else {
          navigateTo("query_snippets", true);
        }
      } else {
        QuerySnippet.get({ id: querySnippetId })
          .then(this.showSnippetDialog)
          .catch(error => {
            this.props.controller.handleError(error);
          });
      }
    }
  }

  saveQuerySnippet = querySnippet => {
    const saveSnippet = querySnippet.id ? QuerySnippet.save : QuerySnippet.create;
    return saveSnippet(querySnippet);
  };

  deleteQuerySnippet = (event, querySnippet) => {
    Modal.confirm({
      title: "Delete Query Snippet",
      content: "Are you sure you want to delete this query snippet?",
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk: () => {
        QuerySnippet.delete(querySnippet)
          .then(() => {
            notification.success("Query snippet deleted successfully.");
            this.props.controller.update();
          })
          .catch(() => {
            notification.error("Failed deleting query snippet.");
          });
      },
    });
  };

  showSnippetDialog = (querySnippet = null) => {
    const canSave = !querySnippet || canEditQuerySnippet(querySnippet);
    navigateTo("query_snippets/" + get(querySnippet, "id", "new"), true);
    QuerySnippetDialog.showModal({
      querySnippet,
      onSubmit: this.saveQuerySnippet,
      readOnly: !canSave,
    })
      .result.then(() => this.props.controller.update())
      .catch(() => {}) // ignore dismiss
      .finally(() => {
        navigateTo("query_snippets", true);
      });
  };

  render() {
    const { controller } = this.props;

    return (
      <div>
        <div className="m-b-15">
          <Button
            type="primary"
            onClick={() => this.showSnippetDialog()}
            disabled={!policy.isCreateQuerySnippetEnabled()}>
            <i className="fa fa-plus m-r-5" />
            New Query Snippet
          </Button>
        </div>

        {!controller.isLoaded && <LoadingState className="" />}
        {controller.isLoaded && controller.isEmpty && (
          <div className="text-center">
            There are no query snippets yet.
            {policy.isCreateQuerySnippetEnabled() && (
              <div className="m-t-5">
                <a className="clickable" onClick={() => this.showSnippetDialog()}>
                  Click here
                </a>{" "}
                to add one.
              </div>
            )}
          </div>
        )}
        {controller.isLoaded && !controller.isEmpty && (
          <div className="table-responsive">
            <ItemsTable
              items={controller.pageItems}
              columns={this.listColumns}
              context={this.actions}
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
      </div>
    );
  }
}

const QuerySnippetsListPage = wrapSettingsTab(
  {
    permission: "create_query",
    title: "Query Snippets",
    path: "query_snippets",
    order: 5,
  },
  itemsList(
    QuerySnippetsList,
    () =>
      new ResourceItemsSource({
        isPlainList: true,
        getRequest() {
          return {};
        },
        getResource() {
          return QuerySnippet.query.bind(QuerySnippet);
        },
      }),
    () => new StateStorage({ orderByField: "trigger", itemsPerPage: 10 })
  )
);

export default [
  routeWithUserSession({
    path: "/query_snippets",
    title: "Query Snippets",
    render: pageProps => <QuerySnippetsListPage {...pageProps} currentPage="query_snippets" />,
  }),
  routeWithUserSession({
    path: "/query_snippets/:querySnippetId(new|[0-9]+)",
    title: "Query Snippets",
    render: pageProps => <QuerySnippetsListPage {...pageProps} currentPage="query_snippets" isNewOrEditPage />,
  }),
];
