import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import ColumnsSettings from "./ColumnsSettings";

import "./editor.less";

export default createTabbedEditor([
  { key: "Columns", title: "Columns", component: ColumnsSettings },
]);
