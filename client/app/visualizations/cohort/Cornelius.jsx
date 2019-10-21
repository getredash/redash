/*!
 * React port of Cornelius library (based on v0.1 released under the MIT license)
 * Original library: http://restorando.github.io/cornelius
 */

import { isNil, isFinite, each, map, extend, min, max } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';
import { createNumberFormatter } from '@/lib/value-format';

import './cornelius.less';

const momentInterval = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
  yearly: 'years',
};

const defaultOptions = {
  title: null,
  repeatLevels: {
    'low': [0, 10], // eslint-disable-line quote-props
    'medium-low': [10, 20],
    'medium': [20, 30], // eslint-disable-line quote-props
    'medium-high': [30, 40],
    'high': [40, 60], // eslint-disable-line quote-props
    'hot': [60, 70], // eslint-disable-line quote-props
    'extra-hot': [70, 100],
  },
  labels: {
    time: 'Time',
    people: 'People',
  },
  timeInterval: 'monthly',
  drawEmptyCells: true,
  rawNumberOnHover: true,
  displayAbsoluteValues: false,
  initialIntervalNumber: 1,
  maxColumns: Number.MAX_SAFE_INTEGER,
  numberFormat: '0,0[.]00',
  percentFormat: '0.00%',
  labelFormat: {
    daily: 'MMMM D, YYYY',
    weekly: '[Week of] MMM D, YYYY',
    monthly: 'MMMM YYYY',
    yearly: 'YYYY',
  },
};

function prepareOptions(options) {
  options = extend({}, defaultOptions, options, {
    initialDate: moment(options.initialDate),
    repeatLevels: extend({}, defaultOptions.repeatLevels, options.repeatLevels),
    labels: extend({}, defaultOptions.labels, options.labels),
    labelFormat: extend({}, defaultOptions.labelFormat, options.labelFormat),
  });

  options.formatNumber = createNumberFormatter(options.numberFormat);
  options.formatPercent = createNumberFormatter(options.percentFormat);

  return options;
}

function formatHeaderLabel(options, index) {
  return index === 0 ? options.labels.people : (options.initialIntervalNumber - 1 + index).toString();
}

function formatTimeLabel(options, offset) {
  const format = options.labelFormat[options.timeInterval];
  const interval = momentInterval[options.timeInterval];
  return options.initialDate.clone().add(offset, interval).format(format);
}

function classNameFor(options, percentageValue) {
  let highestLevel = null;

  const classNames = [options.displayAbsoluteValues ? 'cornelius-absolute' : 'cornelius-percentage'];

  each(options.repeatLevels, (bounds, level) => {
    highestLevel = level;
    if ((percentageValue >= bounds[0]) && (percentageValue < bounds[1])) {
      return false; // break
    }
  });

  // handle 100% case
  if (highestLevel) {
    classNames.push(`cornelius-${highestLevel}`);
  }

  return classNames.join(' ');
}

function CorneliusHeader({ options, maxRowLength }) { // eslint-disable-line react/prop-types
  const cells = [];
  for (let i = 1; i < maxRowLength; i += 1) {
    cells.push(<th key={`col${i}`} className="cornelius-stage">{formatHeaderLabel(options, i)}</th>);
  }

  return (
    <tr>
      <th className="cornelius-time">{options.labels.time}</th>
      <th className="cornelius-people">{formatHeaderLabel(options, 0)}</th>
      {cells}
    </tr>
  );
}

function CorneliusRow({ options, data, index, maxRowLength }) { // eslint-disable-line react/prop-types
  const baseValue = data[0] || 0;

  const cells = [];
  for (let i = 1; i < maxRowLength; i += 1) {
    const value = data[i];
    const percentageValue = isFinite(value / baseValue) ? value / baseValue * 100 : null;
    const cellProps = { key: `col${i}` };

    if (isNil(percentageValue)) {
      if (options.drawEmptyCells) {
        cellProps.className = 'cornelius-empty';
        cellProps.children = '-';
      }
    } else {
      cellProps.className = classNameFor(options, percentageValue);
      cellProps.children = options.displayAbsoluteValues ?
        options.formatNumber(value) :
        options.formatPercent(percentageValue);
      if (options.rawNumberOnHover && !options.displayAbsoluteValues) {
        cellProps.children = (
          <Tooltip title={options.formatNumber(value)} mouseEnterDelay={0} mouseLeaveDelay={0}>
            <div>{cellProps.children}</div>
          </Tooltip>
        );
      }
    }

    cells.push(<td {...cellProps} />);
  }

  return (
    <tr>
      <td className="cornelius-label">{formatTimeLabel(options, index)}</td>
      <td className="cornelius-people">{options.formatNumber(baseValue)}</td>
      {cells}
    </tr>
  );
}

export default function Cornelius({ data, options }) {
  options = useMemo(() => prepareOptions(options), [options]);

  const maxRowLength = useMemo(() => min([
    max(map(data, d => d.length)) || 0,
    options.maxColumns,
  ]), [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="cornelius-container">
      {options.title && <div className="cornelius-title">{options.title}</div>}

      <table className="cornelius-table">
        <thead>
          <CorneliusHeader options={options} maxRowLength={maxRowLength} />
        </thead>
        <tbody>
          {map(data, (row, index) => (
            <CorneliusRow key={`row${index}`} options={options} data={row} index={index} maxRowLength={maxRowLength} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

Cornelius.propTypes = {
  data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  options: PropTypes.shape({
    initialDate: PropTypes.instanceOf(Date).isRequired,
    title: PropTypes.string,
    repeatLevels: PropTypes.object,
    labels: PropTypes.shape({
      time: PropTypes.string,
      people: PropTypes.string,
      weekOf: PropTypes.string,
    }),
    timeInterval: PropTypes.oneOf(['daily', 'weekly', 'monthly']),
    drawEmptyCells: PropTypes.bool,
    rawNumberOnHover: PropTypes.bool,
    displayAbsoluteValues: PropTypes.bool,
    initialIntervalNumber: PropTypes.number,
    labelFormat: PropTypes.shape({
      header: PropTypes.string,
      daily: PropTypes.string,
      weekly: PropTypes.string,
      monthly: PropTypes.string,
      yearly: PropTypes.string,
    }),
  }),
};

Cornelius.defaultProps = {
  data: [],
  options: {},
};
