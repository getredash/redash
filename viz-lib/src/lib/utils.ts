import moment from "moment";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

function formatDateTime(value: any) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(visualizationsSettings.dateTimeFormat);
}

function formatDate(value: any) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(visualizationsSettings.dateFormat);
}

export function formatColumnValue(value: any, columnType = null) {
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
