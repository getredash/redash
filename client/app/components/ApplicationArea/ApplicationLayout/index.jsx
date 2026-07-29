import React, { useRef, useCallback } from "react";
import PropTypes from "prop-types";
import DynamicComponent from "@/components/DynamicComponent";
import { useCurrentRoute } from "@/components/ApplicationArea/Router";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";

import "./index.less";

export default function ApplicationLayout({ children }) {
  const mobileNavbarContainerRef = useRef();
  const currentRoute = useCurrentRoute();
  const routeId = (currentRoute && currentRoute.id) || "";
  const isQueryRoute = routeId.indexOf("Queries.") === 0;
  const isPublicDashboardRoute = routeId.indexOf("Dashboards.ViewShared") === 0;

  const getMobileNavbarPopupContainer = useCallback(() => mobileNavbarContainerRef.current, []);

  return (
    <React.Fragment>
      <DynamicComponent name="ApplicationWrapper">
        <div className="application-layout-side-menu">
          <DynamicComponent name="ApplicationDesktopNavbar">
            <DesktopNavbar />
          </DynamicComponent>
        </div>
        <div className="application-layout-content">
          <nav className="application-layout-top-menu" ref={mobileNavbarContainerRef}>
            <DynamicComponent name="ApplicationMobileNavbar" getPopupContainer={getMobileNavbarPopupContainer}>
              <MobileNavbar getPopupContainer={getMobileNavbarPopupContainer} />
            </DynamicComponent>
          </nav>
          <main className={`application-layout-main ${isQueryRoute ? "application-layout-main--query" : ""}`}>
            {children}
          </main>
          {!isQueryRoute && !isPublicDashboardRoute && (
            <footer className="application-layout-footer">
              <span>© IRIS Security Corporation 2018-2021</span>
              <div className="application-layout-footer-links">
                <a href="/drill_do/license" className="btn btn-xs btn-info" data-skip-router="true">
                  License Info
                </a>
                <a href="/admin/status" className="btn btn-xs btn-info">
                  System status
                </a>
              </div>
            </footer>
          )}
        </div>
      </DynamicComponent>
    </React.Fragment>
  );
}

ApplicationLayout.propTypes = {
  children: PropTypes.node,
};

ApplicationLayout.defaultProps = {
  children: null,
};
