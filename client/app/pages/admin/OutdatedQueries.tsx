import { map } from "lodash";
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
type Props = {
    controller: ControllerType;
};
type State = any;
class OutdatedQueries extends React.Component<Props, State> {
    listColumns = [
        {
            title: "ID",
            field: "id",
            width: "1%",
            align: "right",
            sorter: true,
        },
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
        Columns.avatar({ field: "user", className: "p-l-0 p-r-0" }, (name: any) => `Created by ${name}`),
        (Columns.dateTime as any).sortable({ title: "Created At", field: "created_at" }),
        (Columns.duration as any).sortable({ title: "Runtime", field: "runtime" }),
        (Columns.dateTime as any).sortable({ title: "Last Executed At", field: "retrieved_at", orderByField: "executed_at" }),
        (Columns.custom as any).sortable((text: any, item: any) => <SchedulePhrase schedule={item.schedule} isNew={item.isNew()}/>, {
            title: "Update Schedule",
            field: "schedule",
        }),
    ];
    state = {
        autoUpdate: true,
    };
    _updateTimer = null;
    componentDidMount() {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("view", "page", "admin/queries/outdated");
        this.update(true);
    }
    componentWillUnmount() {
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        clearTimeout(this._updateTimer);
    }
    update = (isInitialCall = false) => {
        if (!isInitialCall && this.state.autoUpdate) {
            (this.props.controller as any).update();
        }
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'null'.
        this._updateTimer = setTimeout(this.update, 60 * 1000);
    };
    render() {
        const { controller } = this.props;
        // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
        return (<Layout activeTab={controller.params.currentPage}>
        <div className="m-15">
          <div>
            <label htmlFor="auto-update-switch" className="m-0">
              Auto update
            </label>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ id: string; className: string; checked: bo... Remove this comment to see the full error message */}
            <Switch id="auto-update-switch" className="m-l-10" checked={this.state.autoUpdate} onChange={autoUpdate => this.setState({ autoUpdate })}/>
          </div>
          {controller.params.lastUpdatedAt && (<div className="m-t-5">
              Last updated: <TimeAgo date={controller.params.lastUpdatedAt * 1000}/>
            </div>)}
        </div>
        {!controller.isLoaded && <LoadingState />}
        {controller.isLoaded && controller.isEmpty && (<div className="text-center p-15">There are no outdated queries.</div>)}
        {controller.isLoaded && !controller.isEmpty && (<div className="bg-white tiled table-responsive">
            {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
            <ItemsTable items={controller.pageItems} columns={this.listColumns} orderByField={controller.orderByField} orderByReverse={controller.orderByReverse} toggleSorting={controller.toggleSorting}/>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(itemsPerPage: any) => any' is not assignabl... Remove this comment to see the full error message */}
            <Paginator showPageSizeSelect totalCount={controller.totalItemsCount} pageSize={controller.itemsPerPage} onPageSizeChange={(itemsPerPage: any) => controller.updatePagination({ itemsPerPage })} page={controller.page} onChange={(page: any) => controller.updatePagination({ page })}/>
          </div>)}
      </Layout>);
    }
}
const OutdatedQueriesPage = itemsList(OutdatedQueries, () => new ItemsSource({
    doRequest(request: any, context: any) {
        return (axios
            .get("/api/admin/queries/outdated")
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'queries' does not exist on type 'AxiosRe... Remove this comment to see the full error message
            // eslint-disable-next-line camelcase
            .then(({ queries, updated_at }) => {
            context.setCustomParams({ lastUpdatedAt: parseFloat(updated_at) });
            return queries;
        }));
    },
    processResults(items: any) {
        return map(items, item => new Query(item));
    },
    isPlainList: true,
}), () => new StateStorage({ orderByField: "created_at", orderByReverse: true }));
routes.register("Admin.OutdatedQueries", routeWithUserSession({
    path: "/admin/queries/outdated",
    title: "Outdated Queries",
    // @ts-expect-error ts-migrate(2322) FIXME: Type '{ currentPage: string; pageTitle?: string | ... Remove this comment to see the full error message
    render: pageProps => <OutdatedQueriesPage {...pageProps} currentPage="outdated_queries"/>,
}));
