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
