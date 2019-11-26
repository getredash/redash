import { isNumber, isFinite, toString, invoke, nth, get, sumBy, map, min, max } from 'lodash';
import numeral from 'numeral';

export const COUNTER_TYPES = {
  rowValue: {
    name: 'Row Value',
    getValue: (rows, { rowNumber, counterColName }) => get(nth(rows, rowNumber), counterColName),
    options: ['counterColName', 'rowNumber', 'targetColName', 'targetRowNumber'],
  },
  countRows: {
    name: 'Count Rows',
    getValue: rows => rows.length,
    options: ['targetColName', 'targetRowNumber'],
  },
  sumRows: {
    name: 'Sum Values',
    getValue: (rows, { counterColName }) => sumBy(rows, counterColName),
    options: ['counterColName', 'targetColName', 'targetRowNumber'],
  },
  minValue: {
    name: 'Min Value',
    getValue: (rows, { counterColName }) => min(map(rows, row => get(row, counterColName))),
    options: ['counterColName', 'targetColName', 'targetRowNumber'],
  },
  maxValue: {
    name: 'Max Value',
    getValue: (rows, { counterColName }) => max(map(rows, row => get(row, counterColName))),
    options: ['counterColName', 'targetColName', 'targetRowNumber'],
  },
};

// TODO: allow user to specify number format string instead of delimiters only
// It will allow to remove this function (move all that weird formatting logic to a migration
// that will set number format for all existing counter visualization)
function numberFormat(value, decimalPoints, decimalDelimiter, thousandsDelimiter) {
  // Temporarily update locale data (restore defaults after formatting)
  const locale = numeral.localeData();
  const savedDelimiters = locale.delimiters;

  // Mimic old behavior - AngularJS `number` filter defaults:
  // - `,` as thousands delimiter
  // - `.` as decimal delimiter
  // - three decimal points
  locale.delimiters = {
    thousands: ',',
    decimal: '.',
  };
  let formatString = '0,0.000';
  if (
    (Number.isFinite(decimalPoints) && (decimalPoints >= 0)) ||
    decimalDelimiter ||
    thousandsDelimiter
  ) {
    locale.delimiters = {
      thousands: thousandsDelimiter,
      decimal: decimalDelimiter || '.',
    };

    formatString = '0,0';
    if (decimalPoints > 0) {
      formatString += '.';
      while (decimalPoints > 0) {
        formatString += '0';
        decimalPoints -= 1;
      }
    }
  }
  const result = numeral(value).format(formatString);

  locale.delimiters = savedDelimiters;
  return result;
}

function formatValue(value, { stringPrefix, stringSuffix, stringDecimal, stringDecChar, stringThouSep }) {
  if (isNumber(value)) {
    value = numberFormat(value, stringDecimal, stringDecChar, stringThouSep);
    return toString(stringPrefix) + value + toString(stringSuffix);
  }
  return toString(value);
}

function formatTooltip(value, formatString) {
  if (isNumber(value)) {
    return numeral(value).format(formatString);
  }
  return toString(value);
}

export function getCounterData(rows, options, visualizationName) {
  const result = {};

  const rowsCount = rows.length;
  if (rowsCount > 0) {
    const { counterType, counterLabel, targetRowNumber, targetColName } = options;

    if (counterLabel) {
      result.counterLabel = counterLabel;
    } else {
      result.counterLabel = visualizationName;
    }

    const counterValue = invoke(COUNTER_TYPES[counterType], 'getValue', rows, options);
    if (counterValue !== null && counterValue !== undefined) {
      result.counterValue = counterValue;
    }

    result.showTrend = false;
    if (targetColName) {
      result.targetValue = get(nth(rows, targetRowNumber), targetColName);

      if (Number.isFinite(result.counterValue) && isFinite(result.targetValue)) {
        const delta = result.counterValue - result.targetValue;
        result.showTrend = true;
        result.trendPositive = delta >= 0;
      }
    } else {
      result.targetValue = null;
    }

    result.counterValueTooltip = formatTooltip(result.counterValue, options.tooltipFormat);
    result.targetValueTooltip = formatTooltip(result.targetValue, options.tooltipFormat);

    result.counterValue = formatValue(result.counterValue, options);

    if (options.formatTargetValue) {
      result.targetValue = formatValue(result.targetValue, options);
    } else {
      if (isFinite(result.targetValue)) {
        result.targetValue = numeral(result.targetValue).format('0[.]00[0]');
      }
    }
  }

  return result;
}

export function isValueNumber(rows, options) {
  if (options.countRow) {
    return true; // array length is always a number
  }

  const rowsCount = rows.length;
  if (rowsCount > 0) {
    const { rowNumber, counterColName } = options;
    if (counterColName) {
      return isNumber(get(nth(rows, rowNumber), counterColName));
    }
  }

  return false;
}
