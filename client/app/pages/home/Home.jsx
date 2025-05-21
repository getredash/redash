import { includes } from "lodash";
import React, { useEffect } from "react";

import Alert from "antd/lib/alert";
import Link from "@/components/Link";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import EmptyState, { EmptyStateHelpMessage } from "@/components/empty-state/EmptyState";
import DynamicComponent from "@/components/DynamicComponent";
import BeaconConsent from "@/components/BeaconConsent";
import PlainButton from "@/components/PlainButton";

import { axios } from "@/services/axios";
import recordEvent from "@/services/recordEvent";
import { currentUser, messages } from "@/services/auth"; // Import currentUser
import notification from "@/services/notification";
import routes from "@/services/routes";
import { DashboardAndQueryFavoritesList } from "./components/FavoritesList";

import "./Home.less";

// New component for dashboard-only viewers
function ViewerDashboardList() {
  const [dashboards, setDashboards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    let isCancelled = false;
    axios.get("api/dashboards")
      .then(response => {
        if (!isCancelled) {
          setDashboards(response.data.results);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setError(err);
          setLoading(false);
          notification.error("Failed to load dashboards.");
        }
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-center">Loading dashboards...</div>;
  }

  if (error) {
    return <div className="text-center text-danger">Error loading dashboards. Please try again later.</div>;
  }

  if (dashboards.length === 0) {
    return <div className="text-center">No dashboards have been shared with you yet.</div>;
  }

  return (
    <div className="viewer-dashboard-list m-t-30">
      <h4>Dashboards</h4>
      <div className="list-group">
        {dashboards.map(dashboard => (
          <Link key={dashboard.id} href={`dashboards/${dashboard.id}-${dashboard.slug}`} className="list-group-item">
            {dashboard.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DeprecatedEmbedFeatureAlert() {
  return (
    <Alert
      className="m-b-15"
      type="warning"
      message={
        <>
          You have enabled <code>ALLOW_PARAMETERS_IN_EMBEDS</code>. This setting is now deprecated and should be turned
          off. Parameters in embeds are supported by default.{" "}
          <Link
            href="https://discuss.redash.io/t/support-for-parameters-in-embedded-visualizations/3337"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read more
          </Link>
          .
        </>
      }
    />
  );
}

function EmailNotVerifiedAlert() {
  const verifyEmail = () => {
    axios.post("verification_email/").then((data) => {
      notification.success(data.message);
    });
  };

  return (
    <Alert
      className="m-b-15"
      type="warning"
      message={
        <>
          We have sent an email with a confirmation link to your email address. Please follow the link to verify your
          email address.{" "}
          <PlainButton type="link" onClick={verifyEmail}>
            Resend email
          </PlainButton>
          .
        </>
      }
    />
  );
}

export default function Home() {
  useEffect(() => {
    recordEvent("view", "page", "personal_homepage");
    // For dashboard viewers, we might want a different event or additional properties
    if (currentUser.isDashboardOnlyViewer()) {
      recordEvent("view", "page", "personal_homepage_dashboard_viewer");
    }
  }, []);

  // Conditional rendering for dashboard-only viewers
  if (currentUser.isDashboardOnlyViewer()) {
    return (
      <div className="home-page viewer-home-page">
        <div className="container">
          {includes(messages, "email-not-verified") && <EmailNotVerifiedAlert />}
          <DynamicComponent name="Home.EmptyState">
            <EmptyState
              header="Welcome to Redash 👋"
              description="View and interact with dashboards shared with you." // Updated description
              illustration="dashboard"
              helpMessage={<EmptyStateHelpMessage helpTriggerType="VIEWER_HOMEPAGE" />} // Could be a new type
              showDashboardStep={false} // Hide default steps
              showInviteStep={false}    // Hide default steps
              onboardingMode={false}    // Disable default onboarding
            />
          </DynamicComponent>
          <ViewerDashboardList />
          <BeaconConsent />
        </div>
      </div>
    );
  }

  // Original Home page content for other users
  return (
    <div className="home-page">
      <div className="container">
        {includes(messages, "using-deprecated-embed-feature") && <DeprecatedEmbedFeatureAlert />}
        {includes(messages, "email-not-verified") && <EmailNotVerifiedAlert />}
        <DynamicComponent name="Home.EmptyState">
          <EmptyState
            header="Welcome to Redash 👋"
            description="Connect to any data source, easily visualize and share your data"
            illustration="dashboard"
            helpMessage={<EmptyStateHelpMessage helpTriggerType="GETTING_STARTED" />}
            showDashboardStep
            showInviteStep
            onboardingMode
          />
        </DynamicComponent>
        {!currentUser.isDashboardOnlyViewer() && <DynamicComponent name="HomeExtra" />}
        {!currentUser.isDashboardOnlyViewer() && <DashboardAndQueryFavoritesList />}
        <BeaconConsent />
      </div>
    </div>
  );
}

routes.register(
  "Home",
  routeWithUserSession({
    path: "/",
    title: "Redash",
    render: (pageProps) => <Home {...pageProps} />,
  })
);
