import { startsWith, isNull } from 'lodash';
import moment from 'moment';
import { Parameter } from '.';

const DATETIME_FORMATS = {
  // eslint-disable-next-line quote-props
  'date': 'YYYY-MM-DD',
  'datetime-local': 'YYYY-MM-DD HH:mm',
  'datetime-with-seconds': 'YYYY-MM-DD HH:mm:ss',
};

const DYNAMIC_PREFIX = 'd_';

const DYNAMIC_DATES = {
  now: {
    name: 'Today/Now',
    value: () => moment(),
  },
  yesterday: {
    name: 'Yesterday',
    value: () => moment().subtract(1, 'day'),
  },
};

export function isDynamicDate(value) {
  if (!startsWith(value, DYNAMIC_PREFIX)) {
    return false;
  }
  return !!DYNAMIC_DATES[value.substring(DYNAMIC_PREFIX.length)];
}

export function getDynamicDate(value) {
  if (!isDynamicDate(value)) {
    return null;
  }
  return DYNAMIC_DATES[value.substring(DYNAMIC_PREFIX.length)];
}

class DateParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.useCurrentDateTime = parameter.useCurrentDateTime;
    this.setValue(parameter.value);
  }

  get hasDynamicValue() {
    return isDynamicDate(this.value);
  }

  get dynamicValue() {
    return getDynamicDate(this.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isDynamicDate(value)) {
      return value;
    }

    const normalizedValue = moment(value);
    return normalizedValue.isValid() ? normalizedValue : null;
  }

  setValue(value) {
    const normalizedValue = this.normalizeValue(value);
    if (moment.isMoment(normalizedValue)) {
      this.value = normalizedValue.format(DATETIME_FORMATS[this.type]);
    } else {
      this.value = normalizedValue;
    }
    this.$$value = normalizedValue;
    this.clearPendingValue();
    return this;
  }

  getValue() {
    if (this.hasDynamicValue) {
      if (this.dynamicValue) {
        return this.dynamicValue.value().format(DATETIME_FORMATS[this.type]);
      }
    }
    if (isNull(this.value) && this.useCurrentDateTime) {
      return moment();
    }
    return this.value;
  }
}

export default DateParameter;
