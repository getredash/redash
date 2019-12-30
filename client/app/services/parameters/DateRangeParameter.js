import { startsWith, has, includes, findKey, values, isObject, isArray } from "lodash";
import moment from "moment";
import PropTypes from "prop-types";
import { Parameter } from ".";

const DATETIME_FORMATS = {
  "date-range": "YYYY-MM-DD",
  "datetime-range": "YYYY-MM-DD HH:mm",
  "datetime-range-with-seconds": "YYYY-MM-DD HH:mm:ss",
};

const DYNAMIC_PREFIX = "d_";

const DYNAMIC_DATE_RANGES = {
  today: {
    name: "Today",
    value: () => [moment().startOf("day"), moment().endOf("day")],
  },
  yesterday: {
    name: "Yesterday",
    value: () => [
      moment()
        .subtract(1, "day")
        .startOf("day"),
      moment()
        .subtract(1, "day")
        .endOf("day"),
    ],
  },
  this_week: {
    name: "This week",
    value: () => [moment().startOf("week"), moment().endOf("week")],
  },
  this_month: {
    name: "This month",
    value: () => [moment().startOf("month"), moment().endOf("month")],
  },
  this_year: {
    name: "This year",
    value: () => [moment().startOf("year"), moment().endOf("year")],
  },
  last_week: {
    name: "Last week",
    value: () => [
      moment()
        .subtract(1, "week")
        .startOf("week"),
      moment()
        .subtract(1, "week")
        .endOf("week"),
    ],
  },
  last_month: {
    name: "Last month",
    value: () => [
      moment()
        .subtract(1, "month")
        .startOf("month"),
      moment()
        .subtract(1, "month")
        .endOf("month"),
    ],
  },
  last_year: {
    name: "Last year",
    value: () => [
      moment()
        .subtract(1, "year")
        .startOf("year"),
      moment()
        .subtract(1, "year")
        .endOf("year"),
    ],
  },
  last_7_days: {
    name: "Last 7 days",
    value: () => [moment().subtract(7, "days"), moment()],
  },
  last_14_days: {
    name: "Last 14 days",
    value: () => [moment().subtract(14, "days"), moment()],
  },
  last_30_days: {
    name: "Last 30 days",
    value: () => [moment().subtract(30, "days"), moment()],
  },
  last_60_days: {
    name: "Last 60 days",
    value: () => [moment().subtract(60, "days"), moment()],
  },
  last_90_days: {
    name: "Last 90 days",
    value: () => [moment().subtract(90, "days"), moment()],
  },
};

export const DynamicDateRangeType = PropTypes.oneOf(values(DYNAMIC_DATE_RANGES));

export function isDynamicDateRangeString(value) {
  if (!startsWith(value, DYNAMIC_PREFIX)) {
    return false;
  }
  return !!DYNAMIC_DATE_RANGES[value.substring(DYNAMIC_PREFIX.length)];
}

export function isDynamicDateRange(value) {
  return includes(DYNAMIC_DATE_RANGES, value);
}

export function getDynamicDateRangeFromString(value) {
  if (!isDynamicDateRangeString(value)) {
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
    return isDynamicDateRange(this.normalizedValue);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isDynamicDateRangeString(value)) {
      return getDynamicDateRangeFromString(value);
    }

    if (isDynamicDateRange(value)) {
      return value;
    }

    if (isObject(value) && !isArray(value)) {
      value = [value.start, value.end];
    }

    if (isArray(value) && value.length === 2) {
      value = [moment(value[0]), moment(value[1])];
      if (value[0].isValid() && value[1].isValid()) {
        return value;
      }
    }
    return null;
  }

  setValue(value) {
    const normalizedValue = this.normalizeValue(value);
    if (isDynamicDateRange(normalizedValue)) {
      this.value = DYNAMIC_PREFIX + findKey(DYNAMIC_DATE_RANGES, normalizedValue);
    } else if (isArray(normalizedValue)) {
      this.value = {
        start: normalizedValue[0].format(DATETIME_FORMATS[this.type]),
        end: normalizedValue[1].format(DATETIME_FORMATS[this.type]),
      };
    } else {
      this.value = normalizedValue;
    }
    this.$$value = normalizedValue;

    this.updateLocals();
    this.clearPendingValue();
    return this;
  }

  getExecutionValue() {
    if (this.hasDynamicValue) {
      const format = date => date.format(DATETIME_FORMATS[this.type]);
      const [start, end] = this.normalizedValue.value().map(format);
      return { start, end };
    }
    return this.value;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;
    if (isObject(this.value) && this.value.start && this.value.end) {
      return {
        [`${prefix}${this.name}`]: `${this.value.start}--${this.value.end}`,
      };
    }
    return super.toUrlParams();
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    const key = `${prefix}${this.name}`;

    // backward compatibility
    const keyStart = `${prefix}${this.name}.start`;
    const keyEnd = `${prefix}${this.name}.end`;

    if (has(query, key)) {
      const dates = query[key].split("--");
      if (dates.length === 2) {
        this.setValue(dates);
      } else {
        this.setValue(query[key]);
      }
    } else if (has(query, keyStart) && has(query, keyEnd)) {
      this.setValue([query[keyStart], query[keyEnd]]);
    }
  }

  toQueryTextFragment() {
    return `{{ ${this.name}.start }} {{ ${this.name}.end }}`;
  }
}

export default DateRangeParameter;
