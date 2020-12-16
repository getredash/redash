import React, { useRef, useCallback } from "react";
import PropTypes from "prop-types";
import DynamicComponent from "@/components/DynamicComponent";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";

import "./index.less";

export default function ApplicationLayout({ children }) {
  const mobileNavbarContainerRef = useRef();

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
          {children}
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
