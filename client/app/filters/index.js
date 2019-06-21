import moment from 'moment';
import { capitalize as _capitalize, isEmpty } from 'lodash';

export const IntervalEnum = {
  NEVER: 'Never',
  SECONDS: 'second',
  MINUTES: 'minute',
  HOURS: 'hour',
  DAYS: 'day',
  WEEKS: 'week',
};

export function localizeTime(time) {
  const [hrs, mins] = time.split(':');
  return moment
    .utc()
    .hour(hrs)
    .minute(mins)
    .local()
    .format('HH:mm');
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

export function intervalToSeconds(count, interval) {
  let intervalInSeconds = 0;
  switch (interval) {
    case IntervalEnum.MINUTES:
      intervalInSeconds = 60;
      break;
    case IntervalEnum.HOURS:
      intervalInSeconds = 3600;
      break;
    case IntervalEnum.DAYS:
      intervalInSeconds = 86400;
      break;
    case IntervalEnum.WEEKS:
      intervalInSeconds = 604800;
      break;
    default:
      return null;
  }
  return intervalInSeconds * count;
}

export function pluralize(text, count) {
  const should = count !== 1;
  return text + (should ? 's' : '');
}

export function durationHumanize(duration, options = {}) {
  if (!duration) {
    return '-';
  }
  let ret = '';
  const { interval, count } = secondsToInterval(duration);
  const rounded = Math.round(count);
  if (rounded !== 1 || !options.omitSingleValueNumber) {
    ret = `${rounded} `;
  }
  ret += pluralize(interval, rounded);
  return ret;
}

export function toHuman(text) {
  return text.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a => a.toUpperCase());
}

export function colWidth(widgetWidth) {
  if (widgetWidth === 0) {
    return 0;
  } else if (widgetWidth === 1) {
    return 6;
  } else if (widgetWidth === 2) {
    return 12;
  }
  return widgetWidth;
}

export function capitalize(text) {
  if (text) {
    return _capitalize(text);
  }

  return null;
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

export function notEmpty(collection) {
  return !isEmpty(collection);
}

export function showError(field) {
  // In case of booleans, we get an undefined here.
  if (field === undefined) {
    return false;
  }
  return field.$touched && field.$invalid;
}

const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function prettySize(bytes) {
  if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
    return '?';
  }

  let unit = 0;

  while (bytes >= 1024) {
    bytes /= 1024;
    unit += 1;
  }

  return bytes.toFixed(3) + ' ' + units[unit];
}

export function join(arr) {
  if (arr === undefined || arr === null) {
    return '';
  }

  return arr.join(' / ');
}
