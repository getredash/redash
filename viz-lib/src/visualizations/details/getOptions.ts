import _ from "lodash";
import {
  getDefaultColumnsOptions,
  getDefaultFormatOptions,
  getColumnsOptions,
} from "@/visualizations/shared/columnUtils";

const DEFAULT_OPTIONS = {};


export default function getOptions(options: any, data: any) {
  if (!data || !data.columns) {
    return { ...DEFAULT_OPTIONS, ...options, columns: [] };
  }

  const { columns } = data;
  options = { ...DEFAULT_OPTIONS, ...options };
  options.columns = _.map(getColumnsOptions(columns, options.columns, { alignContent: "left" }), col => ({
    ...getDefaultFormatOptions(col),
    ...col,
  }));
  return options;
}
