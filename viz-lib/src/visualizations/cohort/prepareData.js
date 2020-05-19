import _ from "lodash";
import moment from "moment";

const momentInterval = {
  weekly: "weeks",
  daily: "days",
  monthly: "months",
};

function groupData(sortedData) {
  const result = {};

  _.each(sortedData, item => {
    const date = moment(item.date);
    const groupKey = date.valueOf();
    result[groupKey] = result[groupKey] || {
      date,
      total: parseInt(item.total, 10) || 0,
      values: {},
    };
    result[groupKey].values[item.stage] = parseInt(item.value, 10) || null;
  });

  return _.values(result);
}

function prepareDiagonalData(sortedData, options) {
  const timeInterval = options.timeInterval;
  const grouped = groupData(sortedData);
  const firstStage = _.min(_.map(sortedData, i => i.stage));
  const stageCount = moment(_.last(grouped).date).diff(_.first(grouped).date, momentInterval[timeInterval]);
  let lastStage = firstStage + stageCount;

  let previousDate = null;

  const data = [];
  _.each(grouped, group => {
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
  const stages = _.map(sortedData, i => i.stage);
  const firstStage = _.min(stages);
  const lastStage = _.max(stages);

  let previousDate = null;

  const data = [];
  _.each(grouped, group => {
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

function isDataValid(rawData, options) {
  const columnNames = _.map(rawData.columns, c => c.name);
  return (
    rawData.rows.length > 0 &&
    _.includes(columnNames, options.dateColumn) &&
    _.includes(columnNames, options.stageColumn) &&
    _.includes(columnNames, options.totalColumn) &&
    _.includes(columnNames, options.valueColumn)
  );
}

export default function prepareData(rawData, options) {
  if (!isDataValid(rawData, options)) {
    return { data: [], initialDate: null };
  }

  rawData = _.map(rawData.rows, item => ({
    date: item[options.dateColumn],
    stage: parseInt(item[options.stageColumn], 10),
    total: parseFloat(item[options.totalColumn]),
    value: parseFloat(item[options.valueColumn]),
  }));
  const sortedData = _.sortBy(rawData, r => r.date + r.stage);
  const initialDate = moment(sortedData[0].date).toDate();

  let data;
  switch (options.mode) {
    case "simple":
      data = prepareSimpleData(sortedData, options);
      break;
    default:
      data = prepareDiagonalData(sortedData, options);
      break;
  }

  return { data, initialDate };
}
