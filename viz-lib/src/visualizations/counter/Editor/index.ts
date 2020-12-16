import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";
import FormatSettings from "./FormatSettings";

export default createTabbedEditor([
  { key: "General", title: "General", component: GeneralSettings },
  { key: "Format", title: "Format", component: FormatSettings },
]);
