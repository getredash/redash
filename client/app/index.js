import React from "react";
import ReactDOM from "react-dom";
import ngModule from "@/config";
import ApplicationArea from "@/components/ApplicationArea";

ngModule.config(($locationProvider, $compileProvider) => {
  $compileProvider.debugInfoEnabled(false);
  $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|data|tel|sms|mailto):/);
  $locationProvider.html5Mode(true);
});

// Hack: wait for ng-app to start application so exports in @/services/ng will be initialized
setTimeout(() => {
  ReactDOM.render(<ApplicationArea />, document.getElementById("application-root"));
}, 200);

export default ngModule;
