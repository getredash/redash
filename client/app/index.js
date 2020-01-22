import React from "react";
import ReactDOM from "react-dom";
import ApplicationArea from "@/components/ApplicationArea";

import "@/config";

import offlineListener from "@/services/offline-listener";

ReactDOM.render(<ApplicationArea />, document.getElementById("application-root"), () => {
  offlineListener.init();
});
