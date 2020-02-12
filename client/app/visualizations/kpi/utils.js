import { isNumber } from "lodash";
import { createNumberFormatter } from "@/lib/value-format";

export function getKpiData(rows, options) {
  if (rows.length === 0 || !options.currentValueColName) {
    return {};
  }

  const formatValue = createNumberFormatter(options.valuesFormat);
  const formatPercentage = createNumberFormatter(options.percentFormat);

  const row = rows[0];
  const currentValue = row[options.currentValueColName];

  let targetValue;
  let trendDirection;
  let deltaAmount;
  let deltaPercentage;
  let deltaPrefix;
  if (options.targetValueColName) {
    targetValue = row[options.targetValueColName];

    deltaAmount = currentValue - targetValue;

    if (deltaAmount > 0) {
      deltaPrefix = "+";
    } else if (deltaAmount < 0) {
      deltaPrefix = "-";
    } else {
      deltaPrefix = "+/-";
    }

    const trendDelta = options.invertTrendDirection ? deltaAmount * -1.0 : deltaAmount;

    if (trendDelta > 0) {
      trendDirection = "positive";
    } else if (trendDelta < 0) {
      trendDirection = "negative";
    } else {
      trendDirection = "neutral";
    }

    deltaPercentage = (currentValue / targetValue) * 100.0 - 100;
  }

  let deltaPercentageString;
  if (options.showDeltaPercentage) {
    deltaPercentageString = formatPercentage(Math.abs(deltaPercentage));
  }

  let deltaAmountString;
  if (options.showDeltaAmount) {
    deltaAmountString = formatValue(Math.abs(deltaAmount), options);
  }

  let deltaValueString;
  if (deltaPercentageString) {
    if (deltaAmountString) {
      deltaValueString = `${deltaPercentageString} (${deltaAmountString})`;
    } else {
      deltaValueString = deltaPercentageString;
    }
  } else if (deltaAmountString) {
    deltaValueString = deltaAmountString;
  }

  let deltaValue;
  if (deltaValueString) {
    deltaValue = `${deltaPrefix} ${deltaValueString}`;
  }

  return {
    currentValue: formatValue(currentValue, options),
    trendDirection: trendDirection,
    deltaValue: deltaValue,
    targetValuePrefixLabel: options.targetValuePrefixLabel,
    targetValue: targetValue ? formatValue(targetValue, options) : null,
  };
}

export function isValueNumber(rows, options) {
  if (rows.length > 0) {
    const currentValueColName = options.currentValueColName;
    if (currentValueColName) {
      return isNumber(rows[0][currentValueColName]);
    }
  }

  return false;
}
