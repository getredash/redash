import _ from "lodash";
import {
  getDefaultFormatOptions,
  getColumnsOptions,
} from "@/visualizations/shared/columnUtils";

const DEFAULT_OPTIONS = {};


export default function getOptions(options: any, { columns }: any) {
  options = { ...DEFAULT_OPTIONS, ...options };
  options.columns = _.map(getColumnsOptions(columns, options.columns, { alignContent: "left" }), col => ({
    ...getDefaultFormatOptions(col),
    ...col,
  }));
  return options;
}
