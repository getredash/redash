import React from "react";
import ReactDOM from "react-dom";
import ApplicationArea from "@/components/ApplicationArea";

// ANGULAR_REMOVE_ME Init angular app to make services working
import "@/config";

// Hack: wait for ng-app to start application so exports in @/services/ng will be initialized
setTimeout(() => {
  ReactDOM.render(<ApplicationArea />, document.getElementById("application-root"));
}, 200);
