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
import routes from "@/services/routes";
import "./QuerySnippetsList.less";
const canEditQuerySnippet = (querySnippet: any) => currentUser.isAdmin || (currentUser as any).id === get(querySnippet, "user.id");
type QuerySnippetsListProps = {
    controller: ControllerType;
};
class QuerySnippetsList extends React.Component<QuerySnippetsListProps> {
    actions: any;
    listColumns = [
        (Columns.custom as any).sortable((text: any, querySnippet: any) => (<div>
          <a className="table-main-title clickable" onClick={() => this.showSnippetDialog(querySnippet)}>
            {querySnippet.trigger}
          </a>
        </div>), {
            title: "Trigger",
            field: "trigger",
            className: "text-nowrap",
        }),
        (Columns.custom as any).sortable((text: any) => text, {
            title: "Description",
            field: "description",
            className: "text-nowrap",
        }),
        Columns.custom((snippet: any) => <code className="snippet-content">{snippet}</code>, {
            title: "Snippet",
            field: "snippet",
        }),
        Columns.avatar({ field: "user", className: "p-l-0 p-r-0" }, (name: any) => `Created by ${name}`),
        (Columns.date as any).sortable({
            title: "Created At",
            field: "created_at",
            className: "text-nowrap",
            width: "1%",
        }),
        // @ts-expect-error ts-migrate(2322) FIXME: Type '"danger"' is not assignable to type '"link" ... Remove this comment to see the full error message
        Columns.custom((text: any, querySnippet: any) => canEditQuerySnippet(querySnippet) && (<Button type="danger" className="w-100" onClick={e => this.deleteQuerySnippet(e, querySnippet)}>
            Delete
          </Button>), {
            width: "1%",
        }),
    ];
    componentDidMount() {
        const { isNewOrEditPage, querySnippetId } = this.props.controller.params;
        if (isNewOrEditPage) {
            if (querySnippetId === "new") {
                if (policy.isCreateQuerySnippetEnabled()) {
                    this.showSnippetDialog();
                }
                else {
                    navigateTo("query_snippets", true);
                }
            }
            else {
                QuerySnippet.get({ id: querySnippetId })
                    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '(querySnippet?: null) => void' i... Remove this comment to see the full error message
                    .then(this.showSnippetDialog)
                    .catch(error => {
                    this.props.controller.handleError(error);
                });
            }
        }
    }
    saveQuerySnippet = (querySnippet: any) => {
        const saveSnippet = querySnippet.id ? QuerySnippet.save : QuerySnippet.create;
        return saveSnippet(querySnippet);
    };
    deleteQuerySnippet = (event: any, querySnippet: any) => {
        Modal.confirm({
            title: "Delete Query Snippet",
            content: "Are you sure you want to delete this query snippet?",
            okText: "Yes",
            okType: "danger",
            cancelText: "No",
            onOk: () => {
                QuerySnippet.delete(querySnippet)
                    .then(() => {
                    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                    notification.success("Query snippet deleted successfully.");
                    (this.props.controller as any).update();
                })
                    .catch(() => {
                    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                    notification.error("Failed deleting query snippet.");
                });
            },
        });
    };
    showSnippetDialog = (querySnippet = null) => {
        const canSave = !querySnippet || canEditQuerySnippet(querySnippet);
        navigateTo("query_snippets/" + get(querySnippet, "id", "new"), true);
        const goToSnippetsList = () => navigateTo("query_snippets", true);
        QuerySnippetDialog.showModal({
            querySnippet,
            readOnly: !canSave,
        })
            .onClose((querySnippet: any) => this.saveQuerySnippet(querySnippet).then(() => {
            (this.props.controller as any).update();
            goToSnippetsList();
        }))
            .onDismiss(goToSnippetsList);
    };
    render() {
        const { controller } = this.props;
        return (<div>
        <div className="m-b-15">
          <Button type="primary" onClick={() => this.showSnippetDialog()} disabled={!policy.isCreateQuerySnippetEnabled()}>
            <i className="fa fa-plus m-r-5"/>
            New Query Snippet
          </Button>
        </div>

        {!controller.isLoaded && <LoadingState className=""/>}
        {controller.isLoaded && controller.isEmpty && (<div className="text-center">
            There are no query snippets yet.
            {policy.isCreateQuerySnippetEnabled() && (<div className="m-t-5">
                <a className="clickable" onClick={() => this.showSnippetDialog()}>
                  Click here
                </a>{" "}
                to add one.
              </div>)}
          </div>)}
        {controller.isLoaded && !controller.isEmpty && (<div className="table-responsive">
            {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
            <ItemsTable items={controller.pageItems} columns={this.listColumns} context={this.actions} orderByField={controller.orderByField} orderByReverse={controller.orderByReverse} toggleSorting={controller.toggleSorting}/>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(itemsPerPage: any) => any' is not assignabl... Remove this comment to see the full error message */}
            <Paginator showPageSizeSelect totalCount={controller.totalItemsCount} pageSize={controller.itemsPerPage} onPageSizeChange={(itemsPerPage: any) => controller.updatePagination({ itemsPerPage })} page={controller.page} onChange={(page: any) => controller.updatePagination({ page })}/>
          </div>)}
      </div>);
    }
}
const QuerySnippetsListPage = wrapSettingsTab("QuerySnippets.List", {
    permission: "create_query",
    title: "Query Snippets",
    path: "query_snippets",
    order: 5,
}, itemsList(QuerySnippetsList, () => new ResourceItemsSource({
    isPlainList: true,
    getRequest() {
        return {};
    },
    getResource() {
        return QuerySnippet.query.bind(QuerySnippet);
    },
}), () => new StateStorage({ orderByField: "trigger", itemsPerPage: 10 })));
routes.register("QuerySnippets.List", routeWithUserSession({
    path: "/query_snippets",
    title: "Query Snippets",
    render: pageProps => <QuerySnippetsListPage {...pageProps} currentPage="query_snippets"/>,
}));
routes.register("QuerySnippets.NewOrEdit", routeWithUserSession({
    path: "/query_snippets/:querySnippetId",
    title: "Query Snippets",
    render: pageProps => <QuerySnippetsListPage {...pageProps} currentPage="query_snippets" isNewOrEditPage/>,
}));
