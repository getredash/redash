import _ from "lodash";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

const filterTypes = ["filter", "multi-filter", "multiFilter"];

export function getColumnNameWithoutType(column: any) {
  let typeSplit;
  if (column.indexOf("::") !== -1) {
    typeSplit = "::";
  } else if (column.indexOf("__") !== -1) {
    typeSplit = "__";
  } else {
    return column;
  }

  const parts = column.split(typeSplit);
  if (parts[0] === "" && parts.length === 2) {
    return parts[1];
  }

  if (!_.includes(filterTypes, parts[1])) {
    return column;
  }

  return parts[0];
}

export function getColumnContentAlignment(type: any) {
  return ["integer", "float", "boolean", "date", "datetime"].indexOf(type) >= 0 ? "right" : "left";
}

export function getDefaultColumnsOptions(columns: any, extraFields = {}) {
  const displayAs = {
    integer: "number",
    float: "number",
    boolean: "boolean",
    date: "datetime",
    datetime: "datetime",
  };

  const defaultFields = {
    // `string` cell options
    allowHTML: false,
    highlightLinks: false,
  };

  return _.map(columns, (col, index) => ({
    name: col.name,
    type: col.type,
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    displayAs: displayAs[col.type] || "string",
    visible: true,
    order: 100000 + index,
    title: getColumnNameWithoutType(col.name),
    alignContent: getColumnContentAlignment(col.type),
    description: "",
    ...defaultFields,
    ...extraFields,
  }));
}

export function getDefaultFormatOptions(column: any) {
  const dateTimeFormat = {
    date: visualizationsSettings.dateFormat || "DD/MM/YYYY",
    datetime: visualizationsSettings.dateTimeFormat || "DD/MM/YYYY HH:mm",
  };
  const numberFormat = {
    integer: visualizationsSettings.integerFormat || "0,0",
    float: visualizationsSettings.floatFormat || "0,0.00",
  };
  return {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    dateTimeFormat: dateTimeFormat[column.type],
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    numberFormat: numberFormat[column.type],
    nullValue: visualizationsSettings.nullValue,
    booleanValues: visualizationsSettings.booleanValues || ["false", "true"],
    // `image` cell options
    imageUrlTemplate: "{{ @ }}",
    imageTitleTemplate: "{{ @ }}",
    imageWidth: "",
    imageHeight: "",
    // `link` cell options
    linkUrlTemplate: "{{ @ }}",
    linkTextTemplate: "{{ @ }}",
    linkTitleTemplate: "{{ @ }}",
    linkOpenInNewTab: true,
  };
}

export function wereColumnsReordered(queryColumns: any, visualizationColumns: any) {
  queryColumns = _.map(queryColumns, col => col.name);
  visualizationColumns = _.map(visualizationColumns, col => col.name);

  // Some columns may be removed - so skip them (but keep original order)
  visualizationColumns = _.filter(visualizationColumns, col => _.includes(queryColumns, col));
  // Pick query columns that were previously saved with viz (but keep order too)
  queryColumns = _.filter(queryColumns, col => _.includes(visualizationColumns, col));

  // Both array now have the same size as they both contains only common columns
  // (in fact, it was an intersection, that kept order of items on both arrays).
  // Now check for equality item-by-item; if common columns are in the same order -
  // they were not reordered in editor
  for (let i = 0; i < queryColumns.length; i += 1) {
    if (visualizationColumns[i] !== queryColumns[i]) {
      return true;
    }
  }
  return false;
}

export function getColumnsOptions(columns: any, visualizationColumns: any, extraFields = {}) {
  const options = getDefaultColumnsOptions(columns, extraFields);

  if (wereColumnsReordered(columns, visualizationColumns)) {
    visualizationColumns = _.fromPairs(
      _.map(visualizationColumns, (col, index) => [col.name, _.extend({}, col, { order: index })])
    );
  } else {
    visualizationColumns = _.fromPairs(_.map(visualizationColumns, col => [col.name, _.omit(col, "order")]));
  }

  _.each(options, col => _.extend(col, visualizationColumns[col.name]));

  return _.sortBy(options, "order");
}
