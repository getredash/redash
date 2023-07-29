import dayjs from "dayjs";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

function formatDateTime(value: any) {
  if (!value) {
    return "";
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(visualizationsSettings.dateTimeFormat);
}

function formatDate(value: any) {
  if (!value) {
    return "";
  }

  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(visualizationsSettings.dateFormat);
}

export function formatColumnValue(value: any, columnType = null) {
  if (dayjs.isDayjs(value)) {
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
