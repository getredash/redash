/*!
 * React port of Cornelius library (based on v0.1 released under the MIT license)
 * Original library: http://restorando.github.io/cornelius
 */

import { isNil, isFinite, each, map, extend, min, max } from 'lodash';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';

import './cornelius.less';

const defaultOptions = {
  title: null,
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'],
  shortMonthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
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
    weekOf: 'Week of',
  },
  timeInterval: 'monthly',
  drawEmptyCells: true,
  rawNumberOnHover: true,
  displayAbsoluteValues: false,
  initialIntervalNumber: 1,
  maxColumns: Number.MAX_SAFE_INTEGER,
  formatLabel: {
    header(i) {
      return i === 0 ? this.labels.people : (this.initialIntervalNumber - 1 + i).toString();
    },
    daily(date, i) {
      date.setDate(date.getDate() + i);
      return this.monthNames[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
    },
    weekly(date, i) {
      date.setDate(date.getDate() + i * 7);
      return this.labels.weekOf + ' ' + this.shortMonthNames[date.getMonth()] + ' ' +
        date.getDate() + ', ' + date.getFullYear();
    },
    monthly(date, i) {
      date.setMonth(date.getMonth() + i);
      return this.monthNames[date.getMonth()] + ' ' + date.getFullYear();
    },
    yearly(date, i) {
      return date.getFullYear() + i;
    },
  },
};

function prepareOptions(options) {
  return extend({}, defaultOptions, options, {
    repeatLevels: extend({}, defaultOptions.repeatLevels, options.repeatLevels),
    labels: extend({}, defaultOptions.labels, options.labels),
    formatLabel: extend({}, defaultOptions.formatLabel, options.formatLabel),
  });
}

function formatHeaderLabel(options, ...args) {
  return options.formatLabel.header.apply(options, args);
}

function formatTimeLabel(options, ...args) {
  const format = (options.formatLabel[options.timeInterval]) || (() => { throw new Error('Interval not supported'); });
  return format.apply(options, args);
}

function classNameFor(options, percentageValue) {
  let highestLevel = null;

  const classNames = [options.displayAbsoluteValues ? 'absolute' : 'percentage'];

  each(options.repeatLevels, (bounds, level) => {
    highestLevel = level;
    if ((percentageValue >= bounds[0]) && (percentageValue < bounds[1])) {
      return false; // break
    }
  });

  // handle 100% case
  if (highestLevel) {
    classNames.push(highestLevel);
  }

  return map(classNames, c => `cornelius-${c}`).join(' ');
}

function CorneliusHeader({ options, maxRowLength }) { // eslint-disable-line react/prop-types
  const cells = [];
  for (let i = 1; i < maxRowLength; i += 1) {
    cells.push(<th key={`col${i}`} className="cornelius-people">{formatHeaderLabel(options, i)}</th>);
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
  const [baseValue] = data;

  const cells = [];
  for (let i = 0; i < maxRowLength; i += 1) {
    const value = data[i];
    const percentageValue = isFinite(value / baseValue) ? value / baseValue * 100 : null;
    const cellProps = { key: `col${i}` };

    if (isNil(percentageValue) && (i !== 0)) {
      if (options.drawEmptyCells) {
        cellProps.className = 'cornelius-empty';
        cellProps.children = '-';
      }
    } else {
      cellProps.className = i === 0 ? 'cornelius-people' : classNameFor(options, percentageValue);
      cellProps.children = i === 0 || options.displayAbsoluteValues ? value : percentageValue.toFixed(2) + '%';
      if (options.rawNumberOnHover) {
        cellProps.children = (
          <Tooltip title={value} mouseEnterDelay={0} mouseLeaveDelay={0}>
            <div>{cellProps.children}</div>
          </Tooltip>
        );
      }
    }

    cells.push(<td {...cellProps} />);
  }

  return (
    <tr>
      <td className="cornelius-label">{formatTimeLabel(options, new Date(options.initialDate.getTime()), index)}</td>
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
        <tbody>
          <CorneliusHeader options={options} maxRowLength={maxRowLength} />
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
    monthNames: PropTypes.arrayOf(PropTypes.string),
    shortMonthNames: PropTypes.arrayOf(PropTypes.string),
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
    formatLabel: PropTypes.shape({
      header: PropTypes.func,
      daily: PropTypes.func,
      weekly: PropTypes.func,
      monthly: PropTypes.func,
      yearly: PropTypes.func,
    }),
  }),
};

Cornelius.defaultProps = {
  data: [],
  options: {},
};
