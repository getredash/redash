/* eslint-disable no-unused-expressions, compat/compat, no-console, no-unused-vars */
import { isEmpty } from "lodash";
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";

import routeWithApiKeySession from "@/components/ApplicationArea/routeWithApiKeySession";
import BigMessage from "@/components/BigMessage";
import Parameters from "@/components/Parameters";
import DashboardGrid from "@/components/dashboards/DashboardGrid";
import Filters from "@/components/Filters";

import { Dashboard } from "@/services/dashboard";
import routes from "@/services/routes";

import useDashboard from "./hooks/useDashboard";

import "./PublicDashboardPage.less";
import PlainButton from "@/components/PlainButton";

function PublicDashboard({ dashboard }) {
  const { globalParameters, filters, setFilters, refreshDashboard, loadWidget, refreshWidget } = useDashboard(
    dashboard
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    window.top?.postMessage({ type: "ready", value: undefined }, "*");

    const observer = new ResizeObserver(entries => {
      const wholeHeight = entries[0]?.target?.scrollHeight;
      if (!wholeHeight) return;
      window.top?.postMessage({ type: "height", value: wholeHeight }, "*");
    });

    observer.observe(document.body);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    refreshDashboard();
    setIsRefreshing(false);
    // eslint-disable-next-line
  }, [isRefreshing]);

  return (
    <div className="container p-t-10 p-b-20">
      {!isEmpty(globalParameters) && (
        <div className="m-b-10 p-15 bg-white tiled">
          <Parameters parameters={globalParameters} onValuesChange={refreshDashboard} />
        </div>
      )}
      {!isEmpty(filters) && (
        <div className="m-b-10 p-15 bg-white tiled">
          <Filters filters={filters} onChange={setFilters} />
        </div>
      )}
      <div id="dashboard-container">
        <PlainButton className="public-dashboard-refreshButton" onClick={() => setIsRefreshing(true)}>
            <i className="fa fa-refresh" aria-hidden="true"></i>
        </PlainButton>
        <DashboardGrid
          dashboard={dashboard}
          widgets={dashboard.widgets}
          filters={filters}
          isEditing={false}
          isPublic
          onLoadWidget={loadWidget}
          onRefreshWidget={refreshWidget}
        />
      </div>
    </div>
  );
}

PublicDashboard.propTypes = {
  dashboard: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

class PublicDashboardPage extends React.Component {
  static propTypes = {
    token: PropTypes.string.isRequired,
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  state = {
    loading: true,
    dashboard: null,
  };

  componentDidMount() {
    Dashboard.getByToken({ token: this.props.token })
      .then(dashboard => this.setState({ dashboard, loading: false }))
      .catch(error => this.props.onError(error));
  }

  render() {
    const { loading, dashboard } = this.state;
    return (
      <div className="public-dashboard-page">
        {loading ? (
          <div className="container loading-message">
            <BigMessage className="" icon="fa-spinner fa-2x fa-pulse" message="Loading..." />
          </div>
        ) : (
          <PublicDashboard dashboard={dashboard} />
        )}
      </div>
    );
  }
}

routes.register(
  "Dashboards.ViewShared",
  routeWithApiKeySession({
    path: "/public/dashboards/:token",
    render: pageProps => <PublicDashboardPage {...pageProps} />,
    getApiKey: currentRoute => currentRoute.routeParams.token,
  })
);
