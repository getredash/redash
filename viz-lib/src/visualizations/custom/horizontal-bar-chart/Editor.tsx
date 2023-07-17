import React from "react";

import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import ChartSettings from "./ChartSettings";

export default createTabbedEditor([{ key: "Chart", title: "Chart", component: ChartSettings }]);
