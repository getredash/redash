import React, { useRef, useCallback } from "react";
import PropTypes from "prop-types";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";

import "./index.less";

export default function ApplicationLayout({ children }) {
  const mobileNavbarContainerRef = useRef();

  const getMobileNavbarPopupContainer = useCallback(() => mobileNavbarContainerRef.current, []);

  return (
    <React.Fragment>
      <div className="application-layout-side-menu">
        <DesktopNavbar />
      </div>
      <div className="application-layout-content">
        <nav className="application-layout-top-menu" ref={mobileNavbarContainerRef}>
          <MobileNavbar getPopupContainer={getMobileNavbarPopupContainer} />
        </nav>
        {children}
      </div>
    </React.Fragment>
  );
}

ApplicationLayout.propTypes = {
  children: PropTypes.node,
};

ApplicationLayout.defaultProps = {
  children: null,
};
