import moment from "moment";
import { clientConfig } from "@/services/auth";

export const IntervalEnum = {
  NEVER: "Never",
  SECONDS: "second",
  MINUTES: "minute",
  HOURS: "hour",
  DAYS: "day",
  WEEKS: "week",
  MILLISECONDS: "millisecond",
};

export const AbbreviatedTimeUnits = {
  SECONDS: "s",
  MINUTES: "m",
  HOURS: "h",
  DAYS: "d",
  WEEKS: "w",
  MILLISECONDS: "ms",
};

function formatDateTimeValue(value, format) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(format);
}

export function formatDateTime(value) {
  return formatDateTimeValue(value, clientConfig.dateTimeFormat);
}

export function formatDateTimePrecise(value, withMilliseconds = false) {
  return formatDateTimeValue(value, clientConfig.dateFormat + (withMilliseconds ? " HH:mm:ss.SSS" : " HH:mm:ss"));
}

export function formatDate(value) {
  return formatDateTimeValue(value, clientConfig.dateFormat);
}

export function localizeTime(time) {
  const [hrs, mins] = time.split(":");
  return moment
    .utc()
    .hour(hrs)
    .minute(mins)
    .local()
    .format("HH:mm");
}

export function secondsToInterval(count) {
  if (!count) {
    return { interval: IntervalEnum.NEVER };
  }

  let interval = IntervalEnum.SECONDS;
  if (count >= 60) {
    count /= 60;
    interval = IntervalEnum.MINUTES;
  }
  if (count >= 60) {
    count /= 60;
    interval = IntervalEnum.HOURS;
  }
  if (count >= 24 && interval === IntervalEnum.HOURS) {
    count /= 24;
    interval = IntervalEnum.DAYS;
  }
  if (count >= 7 && !(count % 7) && interval === IntervalEnum.DAYS) {
    count /= 7;
    interval = IntervalEnum.WEEKS;
  }
  return { count, interval };
}

export function pluralize(text, count) {
  const should = count !== 1;
  return text + (should ? "s" : "");
}

export function durationHumanize(durationInSeconds, options = {}) {
  if (!durationInSeconds) {
    return "-";
  }
  let ret = "";
  const { interval, count } = secondsToInterval(durationInSeconds);
  const rounded = Math.round(count);
  if (rounded !== 1 || !options.omitSingleValueNumber) {
    ret = `${rounded} `;
  }
  ret += pluralize(interval, rounded);
  return ret;
}

export function toHuman(text) {
  return text.replace(/_/g, " ").replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

export function remove(items, item) {
  if (items === undefined) {
    return items;
  }

  let notEquals;

  if (item instanceof Array) {
    notEquals = other => item.indexOf(other) === -1;
  } else {
    notEquals = other => item !== other;
  }

  const filtered = [];

  for (let i = 0; i < items.length; i += 1) {
    if (notEquals(items[i])) {
      filtered.push(items[i]);
    }
  }

  return filtered;
}

/**
 * Formats number to string
 * @param value {number}
 * @param [fractionDigits] {number}
 * @return {string}
 */
export function formatNumber(value, fractionDigits = 3) {
  return Math.round(value) !== value ? value.toFixed(fractionDigits) : value.toString();
}

/**
 * Formats any number using predefined units
 * @param value {string|number}
 * @param divisor {number}
 * @param [units] {Array<string>}
 * @param [fractionDigits] {number}
 * @return {{unit: string, value: string, divisor: number}}
 */
export function prettyNumberWithUnit(value, divisor, units = [], fractionDigits) {
  if (isNaN(parseFloat(value)) || !isFinite(value)) {
    return {
      value: "",
      unit: "",
      divisor: 1,
    };
  }

  let unit = 0;
  let greatestDivisor = 1;

  while (value >= divisor && unit < units.length - 1) {
    value /= divisor;
    greatestDivisor *= divisor;
    unit += 1;
  }

  return {
    value: formatNumber(value, fractionDigits),
    unit: units[unit],
    divisor: greatestDivisor,
  };
}

export function prettySizeWithUnit(bytes, fractionDigits) {
  return prettyNumberWithUnit(bytes, 1024, ["bytes", "KB", "MB", "GB", "TB", "PB"], fractionDigits);
}

export function prettySize(bytes) {
  const { value, unit } = prettySizeWithUnit(bytes);
  if (!value) {
    return "?";
  }
  return value + " " + unit;
}

export function join(arr) {
  if (arr === undefined || arr === null) {
    return "";
  }

  return arr.join(" / ");
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
