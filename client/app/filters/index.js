import moment from 'moment';
import _capitalize from 'underscore.string/capitalize';
import { isEmpty } from 'underscore';

export function durationHumanize(duration) {
  let humanized = '';

  if (duration === undefined) {
    humanized = '-';
  } else if (duration < 60) {
    const seconds = Math.round(duration);
    humanized = `${seconds} seconds`;
  } else if (duration > 3600 * 24) {
    const days = Math.round(parseFloat(duration) / 60.0 / 60.0 / 24.0);
    humanized = `${days} days`;
  } else if (duration === 3600) {
    humanized = '1 hour';
  } else if (duration >= 3600) {
    const hours = Math.round(parseFloat(duration) / 60.0 / 60.0);
    humanized = `${hours} hours`;
  } else if (duration === 60) {
    humanized = '1 minute';
  } else {
    const minutes = Math.round(parseFloat(duration) / 60.0);
    humanized = `${minutes} minutes`;
  }
  return humanized;
}

export function scheduleHumanize(schedule) {
  if (schedule === null) {
    return 'Never';
  } else if (schedule.match(/\d\d:\d\d/) !== null) {
    const parts = schedule.split(':');
    const localTime = moment.utc()
      .hour(parts[0])
      .minute(parts[1])
      .local()
      .format('HH:mm');

    return `Every day at ${localTime}`;
  }

  return `Every ${durationHumanize(parseInt(schedule, 10))}`;
}

export function toHuman(text) {
  return text.replace(/_/g, ' ').replace(/(?:^|\s)\S/g, a =>
    a.toUpperCase());
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

const units = [
  'bytes',
  'KB',
  'MB',
  'GB',
  'TB',
  'PB',
];

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
