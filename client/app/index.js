import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";

import "@/config";

import ApplicationArea from "@/components/ApplicationArea";
import offlineListener from "@/services/offline-listener";
import { store } from "./store";

ReactDOM.render(
  <Provider store={store}>
    <ApplicationArea />
  </Provider>,
  document.getElementById("application-root"),
  () => {
    offlineListener.init();
  }
);
