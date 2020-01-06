import { isObject, cloneDeep, each, extend } from "lodash";
import moment from "moment";
import { clientConfig } from "@/services/auth";

export const IntervalEnum = {
  NEVER: "Never",
  SECONDS: "second",
  MINUTES: "minute",
  HOURS: "hour",
  DAYS: "day",
  WEEKS: "week",
};

export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(clientConfig.dateTimeFormat);
}

export function formatDate(value) {
  if (!value) {
    return "";
  }

  const parsed = moment(value);
  if (!parsed.isValid()) {
    return "-";
  }

  return parsed.format(clientConfig.dateFormat);
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

export function durationHumanize(duration, options = {}) {
  if (!duration) {
    return "-";
  }
  let ret = "";
  const { interval, count } = secondsToInterval(duration);
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

const units = ["bytes", "KB", "MB", "GB", "TB", "PB"];

export function prettySize(bytes) {
  if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
    return "?";
  }

  let unit = 0;

  while (bytes >= 1024) {
    bytes /= 1024;
    unit += 1;
  }

  return bytes.toFixed(3) + " " + units[unit];
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

export function routesToAngularRoutes(routes, template) {
  const result = {};
  template = extend({}, template); // convert to object
  each(routes, ({ path, title, key, ...resolve }) => {
    // Convert to functions
    each(resolve, (value, prop) => {
      resolve[prop] = () => value;
    });

    result[path] = {
      ...template,
      title,
      // keep `resolve` from `template` (if exists)
      resolve: {
        ...template.resolve,
        ...resolve,
        currentPage: () => key,
      },
    };
  });
  return result;
}

// ANGULAR_REMOVE_ME
export function cleanAngularProps(value) {
  // remove all props that start with '$$' - that's what `angular.toJson` does
  const omitAngularProps = obj => {
    each(obj, (v, k) => {
      if (("" + k).startsWith("$$")) {
        delete obj[k];
      } else {
        obj[k] = isObject(v) ? omitAngularProps(v) : v;
      }
    });
    return obj;
  };

  const result = cloneDeep(value);
  return isObject(result) ? omitAngularProps(result) : result;
}
