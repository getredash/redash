import { map, maxBy, sortBy, toString } from "lodash";
import moment from "moment";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

function stepValueToString(value: any) {
  if (moment.isMoment(value)) {
    const format = visualizationsSettings.dateTimeFormat || "DD/MM/YYYY HH:mm";
    return value.format(format);
  }
  return toString(value);
}

export default function prepareData(rows: any, options: any) {
  if (rows.length === 0 || !options.stepCol.colName || !options.valueCol.colName) {
    return [];
  }

  rows = [...rows];
  if (options.sortKeyCol.colName) {
    rows = sortBy(rows, options.sortKeyCol.colName);
  }
  if (options.sortKeyCol.reverse) {
    rows = rows.reverse();
  }

  const data = map(rows, row => ({
    step: stepValueToString(row[options.stepCol.colName]),
    value: parseFloat(row[options.valueCol.colName]) || 0.0,
  }));

  // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
  const maxVal = maxBy(data, d => d.value).value;
  data.forEach((d, i) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'pctMax' does not exist on type '{ step: ... Remove this comment to see the full error message
    d.pctMax = (d.value / maxVal) * 100.0;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'pctPrevious' does not exist on type '{ s... Remove this comment to see the full error message
    d.pctPrevious = i === 0 || d.value === data[i - 1].value ? 100.0 : (d.value / data[i - 1].value) * 100.0;
  });

  return data.slice(0, options.itemsLimit);
}
