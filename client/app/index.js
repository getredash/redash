import React from "react";
import ReactDOM from "react-dom";
import ApplicationArea from "@/components/ApplicationArea";

// ANGULAR_REMOVE_ME Init angular app to make services working
import ngModule from "@/config";

// ANGULAR_REMOVE_ME This setting should be enabled because otherwise it conflicts with `history` module
ngModule.config($locationProvider => {
  $locationProvider.html5Mode(true);
});

// ANGULAR_REMOVE_ME Wait for ng-app to start application so exports in @/services/*** will be initialized
ngModule.run(() => {
  ReactDOM.render(<ApplicationArea />, document.getElementById("application-root"));
});
