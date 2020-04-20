import createTabbedEditor from "@/visualizations/components/editor/createTabbedEditor";

import ColumnsSettings from "./ColumnsSettings";
import GridSettings from "./GridSettings";

import "./editor.less";

export default createTabbedEditor([
  { key: "Columns", title: "Columns", component: ColumnsSettings },
  { key: "Grid", title: "Grid", component: GridSettings },
]);
