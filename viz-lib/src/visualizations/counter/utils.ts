import { isNumber, isFinite, toString } from "lodash";
import { createNumberFormatter } from "@/lib/value-format";

// 0 - special case, use first record
// 1..N - 1-based record number from beginning (wraps if greater than dataset size)
// -1..-N - 1-based record number from end (wraps if greater than dataset size)
function getRowNumber(index: any, rowsCount: any) {
  index = parseInt(index, 10) || 0;
  if (index === 0) {
    return index;
  }
  const wrappedIndex = (Math.abs(index) - 1) % rowsCount;
  return index > 0 ? wrappedIndex : rowsCount - wrappedIndex - 1;
}

function formatValue(value: any, format: any) {
  if (isNumber(value)) {
    const formatNumber = createNumberFormatter(format);
    return formatNumber(value);
  }
  return toString(value);
}

export function getCounterData(rows: any, options: any, visualizationName: any) {
  const result = {};
  const rowsCount = rows.length;

  if (rowsCount > 0 || options.countRow) {
    const counterColName = options.counterColName;
    const targetColName = options.targetColName;

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterLabel' does not exist on type '{}... Remove this comment to see the full error message
    result.counterLabel = options.counterLabel || visualizationName;

    if (options.countRow) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValue' does not exist on type '{}... Remove this comment to see the full error message
      result.counterValue = rowsCount;
    } else if (counterColName) {
      const rowNumber = getRowNumber(options.rowNumber, rowsCount);
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValue' does not exist on type '{}... Remove this comment to see the full error message
      result.counterValue = rows[rowNumber][counterColName];
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'showTrend' does not exist on type '{}'.
    result.showTrend = false;

    if (targetColName) {
      const targetRowNumber = getRowNumber(options.targetRowNumber, rowsCount);
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValue' does not exist on type '{}'... Remove this comment to see the full error message
      result.targetValue = rows[targetRowNumber][targetColName];

      // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValue' does not exist on type '{}... Remove this comment to see the full error message
      if (Number.isFinite(result.counterValue) && isFinite(result.targetValue)) {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValue' does not exist on type '{}... Remove this comment to see the full error message
        const delta = result.counterValue - result.targetValue;
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'showTrend' does not exist on type '{}'.
        result.showTrend = true;
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'trendPositive' does not exist on type '{... Remove this comment to see the full error message
        result.trendPositive = delta >= 0;
      }
    } else {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValue' does not exist on type '{}'... Remove this comment to see the full error message
      result.targetValue = null;
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValueTooltip' does not exist on t... Remove this comment to see the full error message
    result.counterValueTooltip = formatValue(result.counterValue, options.tooltipFormat);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValueTooltip' does not exist on ty... Remove this comment to see the full error message
    result.targetValueTooltip = formatValue(result.targetValue, options.tooltipFormat);

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'counterValue' does not exist on type '{}... Remove this comment to see the full error message
    result.counterValue = formatValue(result.counterValue, options.tooltipFormat);

    if (options.formatTargetValue) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValue' does not exist on type '{}'... Remove this comment to see the full error message
      result.targetValue = formatValue(result.targetValue, options.tooltipFormat);
    } else {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValue' does not exist on type '{}'... Remove this comment to see the full error message
      if (isFinite(result.targetValue)) {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'targetValue' does not exist on type '{}'... Remove this comment to see the full error message
        result.targetValue = formatValue(result.targetValue, {
          useGrouping: false,
          style: "decimal",
          maximumFractionDigits: 3,
        });
      }
    }
  }

  return result;
}

export function isValueNumber(rows: any, options: any) {
  if (options.countRow) {
    return true; // array length is always a number
  }

  const rowsCount = rows.length;
  if (rowsCount > 0) {
    const rowNumber = getRowNumber(options.rowNumber, rowsCount);
    const counterColName = options.counterColName;
    if (counterColName) {
      return isNumber(rows[rowNumber][counterColName]);
    }
  }

  return false;
}
