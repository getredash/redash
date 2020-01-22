/*!
 * React port of Cornelius library (based on v0.1 released under the MIT license)
 * Original library: http://restorando.github.io/cornelius
 */

import { isNil, isFinite, map, extend, min, max } from "lodash";
import moment from "moment";
import chroma from "chroma-js";
import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Tooltip from "antd/lib/tooltip";
import { createNumberFormatter, formatSimpleTemplate } from "@/lib/value-format";
import chooseTextColorForBackground from "@/lib/chooseTextColorForBackground";

import "./cornelius.less";

const momentInterval = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

const timeLabelFormats = {
  daily: "MMMM D, YYYY",
  weekly: "[Week of] MMM D, YYYY",
  monthly: "MMMM YYYY",
  yearly: "YYYY",
};

const defaultOptions = {
  initialDate: null,
  timeInterval: "monthly",
  drawEmptyCells: true,
  rawNumberOnHover: true,
  displayAbsoluteValues: false,
  initialIntervalNumber: 1,
  maxColumns: Infinity,

  title: null,
  timeColumnTitle: "Time",
  peopleColumnTitle: "People",
  stageColumnTitle: "{{ @ }}",
  numberFormat: "0,0[.]00",
  percentFormat: "0.00%",
  timeLabelFormat: timeLabelFormats.monthly,

  colors: {
    min: "#ffffff",
    max: "#041d66",
    steps: 7,
  },
};

function prepareOptions(options) {
  options = extend({}, defaultOptions, options, {
    initialDate: moment(options.initialDate),
    colors: extend({}, defaultOptions.colors, options.colors),
  });

  return extend(options, {
    timeLabelFormat: timeLabelFormats[options.timeInterval],
    formatNumber: createNumberFormatter(options.numberFormat),
    formatPercent: createNumberFormatter(options.percentFormat),
    getColorForValue: chroma
      .scale([options.colors.min, options.colors.max])
      .mode("hsl")
      .domain([0, 100])
      .classes(options.colors.steps),
  });
}

function isLightColor(backgroundColor) {
  backgroundColor = chroma(backgroundColor);
  const white = "#ffffff";
  const black = "#000000";
  return chroma.contrast(backgroundColor, white) < chroma.contrast(backgroundColor, black);
}

function formatStageTitle(options, index) {
  return formatSimpleTemplate(options.stageColumnTitle, { "@": options.initialIntervalNumber - 1 + index });
}

function formatTimeLabel(options, offset) {
  const interval = momentInterval[options.timeInterval];
  return options.initialDate
    .clone()
    .add(offset, interval)
    .format(options.timeLabelFormat);
}

function CorneliusHeader({ options, maxRowLength }) {
  // eslint-disable-line react/prop-types
  const cells = [];
  for (let i = 1; i < maxRowLength; i += 1) {
    cells.push(
      <th key={`col${i}`} className="cornelius-stage">
        {formatStageTitle(options, i)}
      </th>
    );
  }

  return (
    <tr>
      <th className="cornelius-time">{options.timeColumnTitle}</th>
      <th className="cornelius-people">{options.peopleColumnTitle}</th>
      {cells}
    </tr>
  );
}

function CorneliusRow({ options, data, index, maxRowLength }) {
  // eslint-disable-line react/prop-types
  const baseValue = data[0] || 0;

  const cells = [];
  for (let i = 1; i < maxRowLength; i += 1) {
    const value = data[i];
    const percentageValue = isFinite(value / baseValue) ? (value / baseValue) * 100 : null;
    const cellProps = { key: `col${i}` };

    if (isNil(percentageValue)) {
      if (options.drawEmptyCells) {
        cellProps.className = "cornelius-empty";
        cellProps.children = "-";
      }
    } else {
      cellProps.className = options.displayAbsoluteValues ? "cornelius-absolute" : "cornelius-percentage";
      cellProps.children = options.displayAbsoluteValues
        ? options.formatNumber(value)
        : options.formatPercent(percentageValue);

      const backgroundColor = options.getColorForValue(percentageValue);
      cellProps.style = {
        backgroundColor,
        color: chooseTextColorForBackground(backgroundColor),
      };
      if (isLightColor(cellProps.style.color)) {
        cellProps.className += " cornelius-white-text";
      }

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

  const maxRowLength = useMemo(
    () =>
      min([
        max(map(data, d => d.length)) || 0,
        options.maxColumns + 1, // each row includes totals, but `maxColumns` is only for stage columns
      ]),
    [data, options.maxColumns]
  );

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
    timeInterval: PropTypes.oneOf(["daily", "weekly", "monthly", "yearly"]),
    drawEmptyCells: PropTypes.bool,
    rawNumberOnHover: PropTypes.bool,
    displayAbsoluteValues: PropTypes.bool,
    initialIntervalNumber: PropTypes.number,
    maxColumns: PropTypes.number,

    title: PropTypes.string,
    timeColumnTitle: PropTypes.string,
    peopleColumnTitle: PropTypes.string,
    stageColumnTitle: PropTypes.string,
    numberFormat: PropTypes.string,
    percentFormat: PropTypes.string,
    timeLabelFormat: PropTypes.string,

    colors: PropTypes.shape({
      min: PropTypes.string,
      max: PropTypes.string,
      steps: PropTypes.number,
    }),
  }),
};

Cornelius.defaultProps = {
  data: [],
  options: {},
};
