import React from "react";
import ReactDOM from "react-dom";

import "@/config";

import ApplicationArea from "@/components/ApplicationArea";
import offlineListener from "@/services/offline-listener";
import "./i18n/index";

ReactDOM.render(<ApplicationArea />, document.getElementById("application-root"), () => {
  offlineListener.init();
});
