import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

const DEFAULT_OPTIONS = {
  template: "# This is an example\nEdit me!",
  dateTimeFormat: visualizationsSettings.dateTimeFormat,
};

export default function getOptions(options: any) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
  }
};


