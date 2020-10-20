import moment from "moment";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(visualizationsSettings.dateTimeFormat);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(visualizationsSettings.dateFormat);
}

export function formatColumnValue(value, columnType = null) {
  if (moment.isMoment(value)) {
    if (columnType === "date") {
      return formatDate(value);
    }
    return formatDateTime(value);
  }

  if (typeof value === "boolean") {
    return value.toString();
  }

  return value;
}

/**
 * Gets the element length at closest (ceil) position from the nth percentile in a list
 * @param {Array|Object} list
 * @param {number} percentile Closest hundreth percentile
 * @param {string | string[]} sortIteratee Lodash's iteratee or iteratee list
 */
export function getItemOfPercentileLength(list, percentile, sortIteratee = "length") {
  return (
    String(sortBy(list, sortIteratee)[Math.ceil((list.length - 1) * (percentile / 100))]).length * 10
    // 10 is the root document font-size
  );
}
