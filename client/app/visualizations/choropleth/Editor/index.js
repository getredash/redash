import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";
import ColorsSettings from "./ColorsSettings";
import FormatSettings from "./FormatSettings";
import BoundsSettings from "./BoundsSettings";

export default createTabbedEditor([
  { key: "General", title: "General", component: GeneralSettings },
  { key: "Colors", title: "Colors", component: ColorsSettings },
  { key: "Format", title: "Format", component: FormatSettings },
  { key: "Bounds", title: "Bounds", component: BoundsSettings },
]);
