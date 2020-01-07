import React, { useCallback } from "react";
import ApplicationHeader from "@/components/ApplicationHeader";

import Router from "./Router";

export default function ApplicationArea() {
  const handleRouteChange = useCallback(route => {
    console.log(route);
    // TODO: Apply layout (show/hide header, set custom <body> class, etc.)
  }, []);

  return (
    <div>
      <ApplicationHeader />
      <Router onRouteChange={handleRouteChange} />
    </div>
  );
}
