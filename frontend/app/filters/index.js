import moment from 'moment';
import _capitalize from 'underscore.string/capitalize';
import { isEmpty } from 'underscore';

// eslint-disable-next-line
const urlPattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
const clientConfig = {
  dateTimeFormat: '',
};

export function durationHumanize(duration) {
  let humanized = '';

  if (duration === undefined) {
    humanized = '-';
  } else if (duration < 60) {
    const seconds = Math.round(duration);
    humanized = `${seconds}s`;
  } else if (duration > 3600 * 24) {
    const days = Math.round(parseFloat(duration) / 60.0 / 60.0 / 24.0);
    humanized = `${days}days`;
  } else if (duration >= 3600) {
    const hours = Math.round(parseFloat(duration) / 60.0 / 60.0);
    humanized = `${hours}h`;
  } else {
    const minutes = Math.round(parseFloat(duration) / 60.0);
    humanized = `${minutes}m`;
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
     a.toUpperCase()
  );
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

export function dateTime(value) {
  if (!value) {
    return '-';
  }

  return moment(value).format(clientConfig.dateTimeFormat);
}

export function linkify(text) {
  return text.replace(urlPattern, "$1<a href='$2' target='_blank'>$2</a>");
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

export function showError(field, form) {
  return (field.$touched && field.$invalid) || form.$submitted;
}
