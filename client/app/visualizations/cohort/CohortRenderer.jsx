import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { each, first, includes, last, map, max, min, sortBy, values } from 'lodash';
import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';

import { QueryData } from '@/components/proptypes';

const momentInterval = {
  weekly: 'weeks',
  daily: 'days',
  monthly: 'months',
};

function groupData(sortedData) {
  const result = {};

  each(sortedData, (item) => {
    const groupKey = item.date + 0;
    result[groupKey] = result[groupKey] || {
      date: moment(item.date),
      total: parseInt(item.total, 10),
      values: {},
    };
    result[groupKey].values[item.stage] = parseInt(item.value, 10);
  });

  return values(result);
}
function prepareDiagonalData(sortedData, options) {
  const timeInterval = options.timeInterval;
  const grouped = groupData(sortedData);
  const firstStage = min(map(sortedData, i => i.stage));
  const stageCount = moment(last(grouped).date).diff(first(grouped).date, momentInterval[timeInterval]);
  let lastStage = firstStage + stageCount;

  let previousDate = null;

  const data = [];
  each(grouped, (group) => {
    if (previousDate !== null) {
      let diff = Math.abs(previousDate.diff(group.date, momentInterval[timeInterval]));
      while (diff > 1) {
        const row = [0];
        for (let stage = firstStage; stage <= lastStage; stage += 1) {
          row.push(group.values[stage] || 0);
        }
        data.push(row);
        // It should be diagonal, so decrease count of stages for each next row
        lastStage -= 1;
        diff -= 1;
      }
    }

    previousDate = group.date;

    const row = [group.total];
    for (let stage = firstStage; stage <= lastStage; stage += 1) {
      row.push(group.values[stage] || 0);
    }
    // It should be diagonal, so decrease count of stages for each next row
    lastStage -= 1;

    data.push(row);
  });

  return data;
}

function prepareSimpleData(sortedData, options) {
  const timeInterval = options.timeInterval;
  const grouped = groupData(sortedData);
  const stages = map(sortedData, 'stage');
  const firstStage = min(stages);
  const lastStage = max(stages);

  let previousDate = null;

  const data = [];
  each(grouped, (group) => {
    if (previousDate !== null) {
      let diff = Math.abs(previousDate.diff(group.date, momentInterval[timeInterval]));
      while (diff > 1) {
        data.push([0]);
        diff -= 1;
      }
    }

    previousDate = group.date;

    const row = [group.total];
    for (let stage = firstStage; stage <= lastStage; stage += 1) {
      row.push(group.values[stage]);
    }

    data.push(row);
  });

  return data;
}

function prepareData(rawData, options) {
  rawData = map(rawData, item => ({
    date: item[options.dateColumn],
    stage: item[options.stageColumn],
    total: item[options.totalColumn],
    value: item[options.valueColumn],
  }));
  const sortedData = sortBy(rawData, r => r.date + parseInt(r.stage, 10));
  const initialDate = moment(sortedData[0].date).toDate();

  let data;
  switch (options.mode) {
    case 'simple': data = prepareSimpleData(sortedData, options); break;
    default: data = prepareDiagonalData(sortedData, options); break;
  }

  return { data, initialDate };
}

const CohortOptions = PropTypes.shape({
  dateColumn: PropTypes.string.isRequired,
  stageColumn: PropTypes.string.isRequired,
  totalColumn: PropTypes.string.isRequired,
  valueColumn: PropTypes.string.isRequired,
  timeInterval: PropTypes.oneOf(Object.keys(momentInterval)).isRequired,
  mode: PropTypes.oneOf(['simple', 'diagonal']).isRequired,
});

export default class CohortRenderer extends React.Component {
  static Options = CohortOptions

  static DEFAULT_OPTIONS = Object.freeze({
    timeInterval: 'daily',
    mode: 'diagonal',
    dateColumn: 'date',
    stageColumn: 'day_number',
    totalColumn: 'total',
    valueColumn: 'value',
    autoHeight: true,
    defaultRows: 8,
  });

  static propTypes = {
    data: QueryData.isRequired,
    options: CohortOptions.isRequired,
  }

  componentDidMount() {
    this.drawChart();
  }

  componentDidUpdate() {
    this.drawChart();
  }

  drawChart() {
    const node = this.chartRef.current;
    while (node.hasChildNodes()) {
      node.removeChild(node.lastChild);
    }
    if (this.props.data === null) {
      return;
    }
    const options = this.props.options;
    const columnNames = this.props.data.columns.map(i => i.name);
    if (
      !includes(columnNames, options.dateColumn) ||
      !includes(columnNames, options.stageColumn) ||
      !includes(columnNames, options.totalColumn) ||
      !includes(columnNames, options.valueColumn)
    ) {
      return;
    }

    const { data, initialDate } = prepareData(
      this.props.data.rows,
      options,
    );

    window.Cornelius.draw({
      initialDate,
      container: node,
      cohort: data,
      title: null,
      timeInterval: options.timeInterval,
      labels: {
        time: 'Time',
        people: 'Users',
        weekOf: 'Week of',
      },
    });
  }

  chartRef = React.createRef();

  render() {
    return <div ref={this.chartRef} />;
  }
}
