import { omit } from "lodash";
import React from "react";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import Layout from "@/components/admin/Layout";
import * as StatusBlock from "@/components/admin/StatusBlock";
import { axios } from "@/services/axios";
import recordEvent from "@/services/recordEvent";
import routes from "@/services/routes";
import "./system-status.less";
type OwnProps = {
    onError?: (...args: any[]) => any;
};
type State = any;
type Props = OwnProps & typeof SystemStatus.defaultProps;
class SystemStatus extends React.Component<Props, State> {
    static defaultProps = {
        onError: () => { },
    };
    state = {
        queues: [],
        manager: null,
        databaseMetrics: {},
        status: {},
    };
    _refreshTimer = null;
    componentDidMount() {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("view", "page", "admin/status");
        this.refresh();
    }
    componentWillUnmount() {
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        clearTimeout(this._refreshTimer);
    }
    refresh = () => {
        axios
            .get("/status.json")
            .then(data => {
            this.setState({
                queues: (data as any).manager.queues,
                manager: {
                    startedAt: (data as any).manager.started_at * 1000,
                    lastRefreshAt: (data as any).manager.last_refresh_at * 1000,
                    outdatedQueriesCount: (data as any).manager.outdated_queries_count,
                },
                databaseMetrics: (data as any).database_metrics.metrics || [],
                status: omit(data, ["workers", "manager", "database_metrics"]),
            });
        })
            .catch(error => this.props.onError(error));
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'null'.
        this._refreshTimer = setTimeout(this.refresh, 60 * 1000);
    };
    render() {
        return (<Layout activeTab="system_status">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
        <div className="system-status-page">
          <div className="system-status-page-blocks">
            <div className="system-status-page-block">
              <StatusBlock.General info={this.state.status}/>
            </div>
            <div className="system-status-page-block">
              <StatusBlock.Manager info={this.state.manager}/>
            </div>
            <div className="system-status-page-block">
              <StatusBlock.Queues info={this.state.queues}/>
            </div>
            <div className="system-status-page-block">
              <StatusBlock.DatabaseMetrics info={this.state.databaseMetrics}/>
            </div>
          </div>
        </div>
      </Layout>);
    }
}
routes.register("Admin.SystemStatus", routeWithUserSession({
    path: "/admin/status",
    title: "System Status",
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    render: pageProps => <SystemStatus {...pageProps}/>,
}));
