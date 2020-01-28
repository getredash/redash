import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import ColumnsSettings from "./ColumnsSettings";
import OptionsSettings from "./OptionsSettings";
import AppearanceSettings from "./AppearanceSettings";

export default createTabbedEditor([
  { key: "Columns", title: "Columns", component: ColumnsSettings },
  { key: "Options", title: "Options", component: OptionsSettings },
  { key: "Appearance", title: "Appearance", component: AppearanceSettings },
]);
