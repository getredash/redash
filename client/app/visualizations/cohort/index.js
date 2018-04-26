/* global Cornelius */
import _ from 'underscore';
import moment from 'moment';
import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';

import editorTemplate from './cohort-editor.html';

const momentInterval = {
  weekly: 'weeks',
  daily: 'days',
  monthly: 'months',
};

const DEFAULT_OPTIONS = {
  timeInterval: 'daily',
  mode: 'diagonal',
  dateColumn: 'date',
  stageColumn: 'day_number',
  totalColumn: 'total',
  valueColumn: 'value',

  autoHeight: true,
  defaultRows: 8,
};

function groupData(sortedData) {
  const result = {};

  _.each(sortedData, (item) => {
    const groupKey = item.date + 0;
    result[groupKey] = result[groupKey] || {
      date: moment(item.date),
      total: parseInt(item.total, 10),
      values: {},
    };
    result[groupKey].values[item.stage] = parseInt(item.value, 10);
  });

  return _.values(result);
}

function prepareDiagonalData(sortedData, options) {
  const timeInterval = options.timeInterval;
  const grouped = groupData(sortedData);
  const firstStage = _.min(_.pluck(sortedData, 'stage'));
  const stageCount = moment(_.last(grouped).date).diff(_.first(grouped).date, momentInterval[timeInterval]);
  let lastStage = firstStage + stageCount;

  let previousDate = null;

  const data = [];
  _.each(grouped, (group) => {
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
  const stages = _.pluck(sortedData, 'stage');
  const firstStage = _.min(stages);
  const lastStage = _.max(stages);

  let previousDate = null;

  const data = [];
  _.each(grouped, (group) => {
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
  rawData = _.map(rawData, item => ({
    date: item[options.dateColumn],
    stage: item[options.stageColumn],
    total: item[options.totalColumn],
    value: item[options.valueColumn],
  }));
  const sortedData = _.sortBy(rawData, r => r.date + parseInt(r.stage, 10));
  const initialDate = moment(sortedData[0].date).toDate();

  let data;
  switch (options.mode) {
    case 'simple': data = prepareSimpleData(sortedData, options); break;
    default: data = prepareDiagonalData(sortedData, options); break;
  }

  return { data, initialDate };
}

function cohortRenderer() {
  return {
    restrict: 'E',
    scope: {
      queryResult: '=',
      options: '=',
    },
    template: '',
    replace: false,
    link($scope, element) {
      $scope.options = _.extend({}, DEFAULT_OPTIONS, $scope.options);

      function updateCohort() {
        element.empty();

        if ($scope.queryResult.getData() === null) {
          return;
        }

        const columnNames = _.pluck($scope.queryResult.getColumns(), 'name');
        if (
          !_.contains(columnNames, $scope.options.dateColumn) ||
          !_.contains(columnNames, $scope.options.stageColumn) ||
          !_.contains(columnNames, $scope.options.totalColumn) ||
          !_.contains(columnNames, $scope.options.valueColumn)
        ) {
          return;
        }

        const { data, initialDate } = prepareData(
          $scope.queryResult.getData(),
          $scope.options,
        );

        Cornelius.draw({
          initialDate,
          container: element[0],
          cohort: data,
          title: null,
          timeInterval: $scope.options.timeInterval,
          labels: {
            time: 'Time',
            people: 'Users',
            weekOf: 'Week of',
          },
        });
      }

      $scope.$watch('queryResult && queryResult.getData()', updateCohort);
      $scope.$watch('options', updateCohort, true);
    },
  };
}

function cohortEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
    link: ($scope) => {
      $scope.visualization.options = _.extend({}, DEFAULT_OPTIONS, $scope.visualization.options);

      $scope.currentTab = 'columns';
      $scope.setCurrentTab = (tab) => {
        $scope.currentTab = tab;
      };

      function refreshColumns() {
        $scope.columns = $scope.queryResult.getColumns();
        $scope.columnNames = _.pluck($scope.columns, 'name');
      }

      refreshColumns();

      $scope.$watch(
        () => [$scope.queryResult.getId(), $scope.queryResult.status],
        (changed) => {
          if (!changed[0] || changed[1] !== 'done') {
            return;
          }
          refreshColumns();
        },
        true,
      );
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('cohortRenderer', cohortRenderer);
  ngModule.directive('cohortEditor', cohortEditor);

  ngModule.config((VisualizationProvider) => {
    const editTemplate = '<cohort-editor></cohort-editor>';

    VisualizationProvider.registerVisualization({
      type: 'COHORT',
      name: 'Cohort',
      renderTemplate: '<cohort-renderer options="visualization.options" query-result="queryResult"></cohort-renderer>',
      editorTemplate: editTemplate,
      defaultOptions: DEFAULT_OPTIONS,
    });
  });
}
