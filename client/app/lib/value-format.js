import moment from 'moment/moment';
import numeral from 'numeral';
import _ from 'underscore';

// eslint-disable-next-line
const urlPattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;

const hasOwnProperty = Object.prototype.hasOwnProperty;

function createDefaultFormatter(highlightLinks) {
  if (highlightLinks) {
    return (value) => {
      if (_.isString(value)) {
        value = value.replace(urlPattern, '$1<a href="$2" target="_blank">$2</a>');
      }
      return value;
    };
  }
  return value => value;
}

function createDateTimeFormatter(format) {
  if (_.isString(format) && (format !== '')) {
    return (value) => {
      if (value && moment.isMoment(value)) {
        return value.format(format);
      }
      return value;
    };
  }
  return value => value;
}

function createBooleanFormatter(values) {
  if (_.isArray(values)) {
    if (values.length >= 2) {
      // Both `true` and `false` specified
      return value => '' + values[value ? 1 : 0];
    } else if (values.length === 1) {
      // Only `true`
      return value => (value ? values[0] : '');
    }
  }
  return value => (value ? 'true' : 'false');
}

function createNumberFormatter(format) {
  if (_.isString(format) && (format !== '')) {
    const n = numeral(0); // cache `numeral` instance
    return value => (value === null || value === '' ? '' : n.set(value).format(format));
  }
  return value => value;
}

export function createFormatter(column) {
  switch (column.displayAs) {
    case 'number': return createNumberFormatter(column.numberFormat);
    case 'boolean': return createBooleanFormatter(column.booleanValues);
    case 'datetime': return createDateTimeFormatter(column.dateTimeFormat);
    default: return createDefaultFormatter(column.allowHTML && column.highlightLinks);
  }
}

export function formatSimpleTemplate(str, data) {
  if (!_.isString(str)) {
    return '';
  }
  return str.replace(/{{\s*([^\s]+)\s*}}/g, (match, prop) => {
    if (hasOwnProperty.call(data, prop) && !_.isUndefined(data[prop])) {
      return data[prop];
    }
    return match;
  });
}
