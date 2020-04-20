import createTabbedEditor from "@/visualizations/components/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";
import AppearanceSettings from "./AppearanceSettings";

export default createTabbedEditor([
  { key: "General", title: "General", component: GeneralSettings },
  { key: "Appearance", title: "Appearance", component: AppearanceSettings },
]);
