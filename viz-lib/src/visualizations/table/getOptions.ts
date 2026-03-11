import _ from "lodash";
import {
  getDefaultColumnsOptions,
  getDefaultFormatOptions,
  getColumnsOptions,
} from "@/visualizations/shared/columnUtils";

const DEFAULT_OPTIONS = {
  itemsPerPage: 25,
  paginationSize: "default", // not editable through Editor
};


export default function getOptions(options: any, { columns }: any) {
  options = { ...DEFAULT_OPTIONS, ...options };
  options.columns = _.map(getColumnsOptions(columns, options.columns, { allowSearch: false }), col => ({
    ...getDefaultFormatOptions(col),
    ...col,
  }));
  return options;
}
