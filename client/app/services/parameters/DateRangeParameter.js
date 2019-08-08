import { startsWith, has } from 'lodash';
import moment from 'moment';
import { isObject, isArray } from 'util';
import { Parameter } from '.';

const DATETIME_FORMATS = {
  'date-range': 'YYYY-MM-DD',
  'datetime-range': 'YYYY-MM-DD HH:mm',
  'datetime-range-with-seconds': 'YYYY-MM-DD HH:mm:ss',
};

const DYNAMIC_PREFIX = 'd_';

const DYNAMIC_DATE_RANGES = {
  today: {
    name: 'Today',
    value: () => [moment().startOf('day'), moment().endOf('day')],
  },
  yesterday: {
    name: 'Yesterday',
    value: () => [moment().subtract(1, 'day').startOf('day'), moment().subtract(1, 'day').endOf('day')],
  },
  this_week: {
    name: 'This week',
    value: () => [moment().startOf('week'), moment().endOf('week')],
  },
  this_month: {
    name: 'This month',
    value: () => [moment().startOf('month'), moment().endOf('month')],
  },
  this_year: {
    name: 'This year',
    value: () => [moment().startOf('year'), moment().endOf('year')],
  },
  last_week: {
    name: 'Last week',
    value: () => [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
  },
  last_month: {
    name: 'Last month',
    value: () => [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
  },
  last_year: {
    name: 'Last year',
    value: () => [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
  },
  last_7_days: {
    name: 'Last 7 days',
    value: () => [moment().subtract(7, 'days'), moment()],
  },
};

export function isDynamicDateRange(value) {
  if (!startsWith(value, DYNAMIC_PREFIX)) {
    return false;
  }
  return !!DYNAMIC_DATE_RANGES[value.substring(DYNAMIC_PREFIX.length)];
}

export function getDynamicDateRange(value) {
  if (!isDynamicDateRange(value)) {
    return null;
  }
  return DYNAMIC_DATE_RANGES[value.substring(DYNAMIC_PREFIX.length)];
}

class DateRangeParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.setValue(parameter.value);
  }

  get hasDynamicValue() {
    return isDynamicDateRange(this.value);
  }

  get dynamicValue() {
    return getDynamicDateRange(this.value);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isDynamicDateRange(value)) {
      return value;
    }

    if (isObject(value) && !isArray(value)) {
      value = [value.start, value.end];
    }

    if (isArray(value) && (value.length === 2)) {
      value = [moment(value[0]), moment(value[1])];
      if (value[0].isValid() && value[1].isValid()) {
        return value;
      }
    }
    return null;
  }

  setValue(value) {
    const normalizedValue = this.normalizeValue(value);
    if (isArray(normalizedValue)) {
      this.value = {
        start: normalizedValue[0].format(DATETIME_FORMATS[this.type]),
        end: normalizedValue[1].format(DATETIME_FORMATS[this.type]),
      };
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
        const dateRange = this.dynamicValue.value();
        return {
          start: dateRange[0].format(DATETIME_FORMATS[this.type]),
          end: dateRange[1].format(DATETIME_FORMATS[this.type]),
        };
      }
    }
    return this.value;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;
    if (isObject(this.value) && this.value.start && this.value.end) {
      return {
        [`${prefix}${this.name}`]: null,
        [`${prefix}${this.name}.start`]: this.value.start,
        [`${prefix}${this.name}.end`]: this.value.end,
      };
    }
    return super.toUrlParams();
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    const key = `${prefix}${this.name}`;
    const keyStart = `${prefix}${this.name}.start`;
    const keyEnd = `${prefix}${this.name}.end`;
    if (has(query, key)) {
      this.setValue(query[key]);
    } else if (has(query, keyStart) && has(query, keyEnd)) {
      this.setValue([query[keyStart], query[keyEnd]]);
    }
  }

  toQueryTextFragment() {
    return `{{ ${this.name}.start }} {{ ${this.name}.end }}`;
  }
}

export default DateRangeParameter;
