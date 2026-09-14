import React, { useState, useEffect } from "react";

import Router from "@/components/ApplicationArea/Router";
import ApplicationLayout from "@/components/ApplicationArea/ApplicationLayout";
import ErrorMessage from "@/components/ApplicationArea/ErrorMessage";
import handleNavigationIntent from "@/components/ApplicationArea/handleNavigationIntent";
import { registerComponent } from "@/components/DynamicComponent";

import GlobalDesktopNavbar from "./GlobalDesktopNavbar";
import DeploymentGuide from "./DeploymentGuide";
import ComposedDashboardListPage from "./ComposedDashboardList";
import ComposedDashboardEdit from "./ComposedDashboardEdit";
import ComposedDashboardDeploymentsPage from "./ComposedDashboardDeployments";
import SubDashboardListPage from "./SubDashboardList";
import SubDashboardAssignments from "./SubDashboardAssignments";

// Reuse Redash's application chrome, but swap the navbar for one that doesn't
// depend on an org-scoped currentUser (which doesn't exist in Redash Global).
registerComponent("ApplicationDesktopNavbar", GlobalDesktopNavbar);

const routes = [
  {
    id: "Home",
    path: "/",
    title: "Global Admin",
    render: () => <DeploymentGuide />,
  },
  {
    id: "ComposedDashboards.List",
    path: "/composed-dashboards",
    title: "Composed Dashboards",
    render: () => <ComposedDashboardListPage pageTitle="Composed Dashboards" />,
  },
  {
    id: "ComposedDashboards.Edit",
    path: "/composed-dashboards/:composedDashboardId/edit",
    title: "Edit Composed Dashboard",
    render: (currentRoute) => (
      <ComposedDashboardEdit composedDashboardId={currentRoute.routeParams.composedDashboardId} />
    ),
  },
  {
    id: "ComposedDashboards.Deployments",
    path: "/composed-dashboards/:composedDashboardId/deployments",
    title: "Deployment History",
    render: (currentRoute) => (
      <ComposedDashboardDeploymentsPage composedDashboardId={currentRoute.routeParams.composedDashboardId} />
    ),
  },
  {
    id: "SubDashboards.List",
    path: "/sub-dashboards",
    title: "Sub-Dashboards",
    render: () => <SubDashboardListPage pageTitle="Sub-Dashboards" />,
  },
  {
    id: "SubDashboards.Assignments",
    path: "/sub-dashboards/:dashboardId/assignments",
    title: "Sub-Dashboard Assignments",
    render: (currentRoute) => <SubDashboardAssignments dashboardId={currentRoute.routeParams.dashboardId} />,
  },
];

export default function GlobalApplicationArea() {
  const [currentRoute, setCurrentRoute] = useState(null);
  const [unhandledError, setUnhandledError] = useState(null);

  useEffect(() => {
    if (currentRoute && currentRoute.title) {
      document.title = currentRoute.title;
    }
  }, [currentRoute]);

  useEffect(() => {
    function globalErrorHandler(event) {
      event.preventDefault();
      setUnhandledError(event.error);
    }

    document.body.addEventListener("click", handleNavigationIntent, false);
    window.addEventListener("error", globalErrorHandler, false);

    return () => {
      document.body.removeEventListener("click", handleNavigationIntent, false);
      window.removeEventListener("error", globalErrorHandler, false);
    };
  }, []);

  if (unhandledError) {
    return <ErrorMessage error={unhandledError} />;
  }

  return (
    <ApplicationLayout>
      <Router routes={routes} onRouteChange={setCurrentRoute} />
    </ApplicationLayout>
  );
}
