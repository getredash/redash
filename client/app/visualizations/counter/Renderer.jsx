import { isNumber, isFinite, toString } from 'lodash';
import numeral from 'numeral';
import React, { useState, useEffect } from 'react';
import cx from 'classnames';
import resizeObserver from '@/services/resizeObserver';
import { RendererPropTypes } from '@/visualizations';

import './render.less';


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

// TODO: Need to review this function, it does not properly handle edge cases.
function getRowNumber(index, size) {
  if (index >= 0) {
    return index - 1;
  }

  if (Math.abs(index) > size) {
    index %= size;
  }

  return size + index;
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

function getCounterData(data, options, visualizationName) {
  const result = {};

  if (data.length > 0) {
    const rowNumber = getRowNumber(options.rowNumber, data.length);
    const targetRowNumber = getRowNumber(options.targetRowNumber, data.length);
    const counterColName = options.counterColName;
    const targetColName = options.targetColName;
    const counterLabel = options.counterLabel;

    if (counterLabel) {
      result.counterLabel = counterLabel;
    } else {
      result.counterLabel = visualizationName;
    }

    if (options.countRow) {
      result.counterValue = data.length;
    } else if (counterColName) {
      result.counterValue = data[rowNumber][counterColName];
    }

    result.showTrend = false;
    if (targetColName) {
      result.targetValue = data[targetRowNumber][targetColName];

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

function getCounterStyles(scale) {
  return {
    OTransform: `scale(${scale})`,
    MsTransform: `scale(${scale})`,
    MozTransform: `scale(${scale})`,
    WebkitTransform: `scale(${scale})`,
    transform: `scale(${scale})`,
  };
}

function getCounterScale(container) {
  const inner = container.firstChild;
  const scale = Math.min(container.offsetWidth / inner.offsetWidth, container.offsetHeight / inner.offsetHeight);
  return Number(isFinite(scale) ? scale : 1).toFixed(2); // keep only two decimal places
}

export default function Renderer({ data, options, visualizationName }) {
  const [scale, setScale] = useState('1.00');
  const [container, setContainer] = useState(null);

  useEffect(() => {
    if (container) {
      setScale(getCounterScale(container)); // initial update
      const unwatch = resizeObserver(container, () => {
        setScale(getCounterScale(container));
      });
      return unwatch;
    }
  }, [container, setScale]);

  const {
    showTrend, trendPositive,
    counterValue, counterValueTooltip,
    targetValue, targetValueTooltip,
    counterLabel,
  } = getCounterData(data.rows, options, visualizationName);
  return (
    <div
      className={cx(
        'counter-visualization-container',
        { 'trend-positive': showTrend && trendPositive, 'trend-negative': showTrend && !trendPositive },
      )}
    >
      <div className="counter-visualization-content" ref={setContainer}>
        <div style={getCounterStyles(scale)}>
          <div className="counter-visualization-value" title={counterValueTooltip}>{counterValue}</div>
          {targetValue && (
            <div className="counter-visualization-target" title={targetValueTooltip}>({targetValue})</div>
          )}
          <div className="counter-visualization-label">{counterLabel}</div>
        </div>
      </div>
    </div>
  );
}

Renderer.propTypes = RendererPropTypes;
