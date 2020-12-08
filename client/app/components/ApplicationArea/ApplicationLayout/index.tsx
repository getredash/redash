import React, { useRef, useCallback } from "react";
import DynamicComponent from "@/components/DynamicComponent";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";

import "./index.less";

type OwnProps = {
    children?: React.ReactNode;
};

type Props = OwnProps & typeof ApplicationLayout.defaultProps;

export default function ApplicationLayout({ children }: Props) {
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
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'MutableRefObject<undefined>' is not assignab... Remove this comment to see the full error message */}
          <nav className="application-layout-top-menu" ref={mobileNavbarContainerRef}>
            {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
            <DynamicComponent name="ApplicationMobileNavbar" getPopupContainer={getMobileNavbarPopupContainer}>
              {/* @ts-expect-error ts-migrate(2322) FIXME: Type '() => undefined' is not assignable to type '... Remove this comment to see the full error message */}
              <MobileNavbar getPopupContainer={getMobileNavbarPopupContainer} />
            </DynamicComponent>
          </nav>
          {children}
        </div>
      </DynamicComponent>
    </React.Fragment>
  );
}

ApplicationLayout.defaultProps = {
  children: null,
};
