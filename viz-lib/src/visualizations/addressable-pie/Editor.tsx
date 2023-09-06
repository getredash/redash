/* eslint-disable react/prop-types */
import React from "react";
import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";

import "./editor.less";

export default createTabbedEditor([
  {
    key: "General",
    title: "General",
    component: (props: any) => (
      <React.Fragment>
        <GeneralSettings {...props} />
      </React.Fragment>
    ),
  },
]);
