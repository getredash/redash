import { isEmpty } from "lodash";
import React from "react";
import routeWithApiKeySession from "@/components/ApplicationArea/routeWithApiKeySession";
import Link from "@/components/Link";
import BigMessage from "@/components/BigMessage";
import PageHeader from "@/components/PageHeader";
import Parameters from "@/components/Parameters";
import DashboardGrid from "@/components/dashboards/DashboardGrid";
import Filters from "@/components/Filters";
import { Dashboard } from "@/services/dashboard";
import routes from "@/services/routes";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '@/assets/images/redash_icon_sm... Remove this comment to see the full error message
import logoUrl from "@/assets/images/redash_icon_small.png";
import useDashboard from "./hooks/useDashboard";
import "./PublicDashboardPage.less";
type PublicDashboardProps = {
    dashboard: any;
};
function PublicDashboard({ dashboard }: PublicDashboardProps) {
    const { globalParameters, filters, setFilters, refreshDashboard, loadWidget, refreshWidget } = useDashboard(dashboard);
    return (<div className="container p-t-10 p-b-20">
      <PageHeader title={dashboard.name}/>
      {!isEmpty(globalParameters) && (<div className="m-b-10 p-15 bg-white tiled">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(updatedParameters: any) => void' is not ass... Remove this comment to see the full error message */}
          <Parameters parameters={globalParameters} onValuesChange={refreshDashboard}/>
        </div>)}
      {!isEmpty(filters) && (<div className="m-b-10 p-15 bg-white tiled">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<never[]>>' is not as... Remove this comment to see the full error message */}
          <Filters filters={filters} onChange={setFilters}/>
        </div>)}
      <div id="dashboard-container">
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(widget: any, forceRefresh?: any) => any' is... Remove this comment to see the full error message */}
        <DashboardGrid dashboard={dashboard} widgets={dashboard.widgets} filters={filters} isEditing={false} isPublic onLoadWidget={loadWidget} onRefreshWidget={refreshWidget}/>
      </div>
    </div>);
}
type OwnPublicDashboardPageProps = {
    token: string;
    onError?: (...args: any[]) => any;
};
type PublicDashboardPageState = any;
type PublicDashboardPageProps = OwnPublicDashboardPageProps & typeof PublicDashboardPage.defaultProps;
class PublicDashboardPage extends React.Component<PublicDashboardPageProps, PublicDashboardPageState> {
    static defaultProps = {
        onError: () => { },
    };
    state = {
        loading: true,
        dashboard: null,
    };
    componentDidMount() {
        (Dashboard as any).getByToken({ token: this.props.token })
            .then((dashboard: any) => this.setState({ dashboard, loading: false }))
            .catch((error: any) => this.props.onError(error));
    }
    render() {
        const { loading, dashboard } = this.state;
        return (<div className="public-dashboard-page">
        {loading ? (<div className="container loading-message">
            <BigMessage className="" icon="fa-spinner fa-2x fa-pulse" message="Loading..."/>
          </div>) : (<PublicDashboard dashboard={dashboard}/>)}
        <div id="footer">
          <div className="text-center">
            <Link href="https://redash.io">
              <img alt="Redash Logo" src={logoUrl} width="38"/>
            </Link>
          </div>
          Powered by <Link href="https://redash.io/?ref=public-dashboard">Redash</Link>
        </div>
      </div>);
    }
}
routes.register("Dashboards.ViewShared", routeWithApiKeySession({
    path: "/public/dashboards/:token",
    render: (pageProps: any) => <PublicDashboardPage {...pageProps}/>,
    getApiKey: (currentRoute: any) => currentRoute.routeParams.token,
}));
