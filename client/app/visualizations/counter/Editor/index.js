import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";
import PrimaryValueSettings from "./PrimaryValueSettings";
import SecondaryValueSettings from "./SecondaryValueSettings";

export default createTabbedEditor([
  { key: "General", title: "General", component: GeneralSettings },
  { key: "PrimaryValue", title: "Primary Value", component: PrimaryValueSettings },
  { key: "SecondaryValue", title: "Secondary Value", component: SecondaryValueSettings },
]);
