import { findKey, startsWith, has, includes, isNull, values } from "lodash";
import moment from "moment";
import PropTypes from "prop-types";
import { Parameter } from ".";

const DATETIME_FORMATS = {
  // eslint-disable-next-line quote-props
  date: "YYYY-MM-DD",
  "datetime-local": "YYYY-MM-DD HH:mm",
  "datetime-with-seconds": "YYYY-MM-DD HH:mm:ss",
};

const DYNAMIC_PREFIX = "d_";

const DYNAMIC_DATES = {
  now: {
    name: "Today/Now",
    value: () => moment(),
  },
  yesterday: {
    name: "Yesterday",
    value: () => moment().subtract(1, "day"),
  },
};

export const DynamicDateType = PropTypes.oneOf(values(DYNAMIC_DATES));

function isDynamicDateString(value) {
  return startsWith(value, DYNAMIC_PREFIX) && has(DYNAMIC_DATES, value.substring(DYNAMIC_PREFIX.length));
}

export function isDynamicDate(value) {
  return includes(DYNAMIC_DATES, value);
}

export function getDynamicDateFromString(value) {
  if (!isDynamicDateString(value)) {
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
    return isDynamicDate(this.normalizedValue);
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeValue(value) {
    if (isDynamicDateString(value)) {
      return getDynamicDateFromString(value);
    }

    if (isDynamicDate(value)) {
      return value;
    }

    const normalizedValue = moment(value);
    return normalizedValue.isValid() ? normalizedValue : null;
  }

  setValue(value) {
    const normalizedValue = this.normalizeValue(value);
    if (isDynamicDate(normalizedValue)) {
      this.value = DYNAMIC_PREFIX + findKey(DYNAMIC_DATES, normalizedValue);
    } else if (moment.isMoment(normalizedValue)) {
      this.value = normalizedValue.format(DATETIME_FORMATS[this.type]);
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
      return this.normalizedValue.value().format(DATETIME_FORMATS[this.type]);
    }
    if (isNull(this.value) && this.useCurrentDateTime) {
      return moment().format(DATETIME_FORMATS[this.type]);
    }
    return this.value;
  }
}

export default DateParameter;
