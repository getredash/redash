import { extend } from "lodash";
import HelpTrigger from "@/components/HelpTrigger";

export const visualizationsSettings = {
  HelpTriggerComponent: HelpTrigger,
  dateFormat: "DD/MM/YYYY",
  dateTimeFormat: "DD/MM/YYYY HH:mm",
  integetFormat: "0,0",
  floatFormat: "0,0.00",
  booleanValues: ["false", "true"],
  tableCellMaxJSONSize: 50000,
  allowCustomJSVisualizations: false,
  hidePlotlyModeBar: false,
  choroplethAvailableMaps: {},
};

export function updateVisualizationsSettings(options) {
  extend(visualizationsSettings, options);
}
