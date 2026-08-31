import { isEmpty } from "lodash";
import PropTypes from "prop-types";
import React, { useEffect, useState } from "react";

import routeWithApiKeySession from "@/components/ApplicationArea/routeWithApiKeySession";
import BigMessage from "@/components/BigMessage";
import DashboardGrid from "@/components/dashboards/DashboardGrid";
import Filters from "@/components/Filters";
import Link from "@/components/Link";
import PageHeader from "@/components/PageHeader";
import Parameters from "@/components/Parameters";
import useOrganizationSettings from "@/pages/settings/hooks/useOrganizationSettings";

import { Dashboard } from "@/services/dashboard";
import routes from "@/services/routes";

import logoUrl from "@/assets/images/redash_icon_small.png";

import useDashboard from "./hooks/useDashboard";

import "./PublicDashboardPage.less";

function PublicDashboard({ dashboard }) {
  const { globalParameters, filters, setFilters, refreshDashboard, loadWidget, refreshWidget } =
    useDashboard(dashboard);

  return (
    <div className="container p-t-10 p-b-20">
      <PageHeader title={dashboard.name} />
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

function PublicDashboardPage({ token, onError = () => {} }) {
  const { settings } = useOrganizationSettings({ onError: () => {} });
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let mounted = true;

    Dashboard.getByToken({ token })
      .then((d) => {
        if (!mounted) return;
        setDashboard(d);
        setLoading(false);
      })
      .catch((error) => onError(error));

    return () => {
      mounted = false;
    };
  }, [token, onError]);

  return (
    <div className="public-dashboard-page">
      {loading ? (
        <div className="container loading-message">
          <BigMessage className="" icon="fa-spinner fa-2x fa-pulse" message="Loading..." />
        </div>
      ) : (
        <PublicDashboard dashboard={dashboard} />
      )}
      <div id="footer">
        <div className="text-center">
          <Link href="https://redash.io">
            <img alt="Redash Logo" src={settings.logo_url || logoUrl} width="38" />
          </Link>
        </div>
        Powered by <Link href="https://redash.io/?ref=public-dashboard">Redash</Link>
      </div>
    </div>
  );
}

PublicDashboardPage.propTypes = {
  token: PropTypes.string.isRequired,
  onError: PropTypes.func,
};

PublicDashboardPage.defaultProps = {
  onError: () => {},
};

routes.register(
  "Dashboards.ViewShared",
  routeWithApiKeySession({
    path: "/public/dashboards/:token",
    render: (pageProps) => <PublicDashboardPage {...pageProps} />,
    getApiKey: (currentRoute) => currentRoute.routeParams.token,
  })
);
