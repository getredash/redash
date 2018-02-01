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
  dayNumberColumn: 'day_number',
  totalColumn: 'total',
  valueColumn: 'value',
};

function groupData(sortedData) {
  const result = {};

  _.each(sortedData, (item) => {
    const groupKey = item.date + 0;
    result[groupKey] = result[groupKey] || {
      date: item.date,
      total: parseInt(item.total, 10),
      values: {},
    };
    result[groupKey].values[item.dayNumber] = parseInt(item.value, 10);
  });

  return _.values(result);
}

function prepareDiagonalData(sortedData, options) {
  const timeInterval = options.timeInterval;
  const grouped = groupData(sortedData);
  const firstDayNumber = _.min(_.pluck(sortedData, 'dayNumber'));
  const dayCount = moment(_.last(grouped).date).diff(_.first(grouped).date, momentInterval[timeInterval]);
  let lastDayNumber = firstDayNumber + dayCount;

  let previousDay = null;

  const data = [];
  _.each(grouped, (group) => {
    if (previousDay !== null) {
      let diff = Math.abs(previousDay.diff(group.date, momentInterval[timeInterval]));
      while (diff > 1) {
        const row = [0];
        for (let dayNumber = firstDayNumber; dayNumber <= lastDayNumber; dayNumber += 1) {
          row.push(group.values[dayNumber] || 0);
        }
        data.push(row);
        // It should be diagonal, so decrease count of days for each next row
        lastDayNumber -= 1;
        diff -= 1;
      }
    }

    previousDay = group.date;

    const row = [group.total];
    for (let dayNumber = firstDayNumber; dayNumber <= lastDayNumber; dayNumber += 1) {
      row.push(group.values[dayNumber] || 0);
    }
    // It should be diagonal, so decrease count of days for each next row
    lastDayNumber -= 1;

    data.push(row);
  });

  return data;
}

function prepareSimpleData(sortedData, options) {
  const timeInterval = options.timeInterval;
  const grouped = groupData(sortedData);
  const dayNumbers = _.pluck(sortedData, 'dayNumber');
  const firstDayNumber = _.min(dayNumbers);
  const lastDayNumber = _.max(dayNumbers);

  let previousDay = null;

  const data = [];
  _.each(grouped, (group) => {
    if (previousDay !== null) {
      let diff = Math.abs(previousDay.diff(group.date, momentInterval[timeInterval]));
      while (diff > 1) {
        data.push([0]);
        diff -= 1;
      }
    }

    previousDay = group.date;

    const row = [group.total];
    for (let dayNumber = firstDayNumber; dayNumber <= lastDayNumber; dayNumber += 1) {
      row.push(group.values[dayNumber]);
    }

    data.push(row);
  });

  return data;
}

function prepareData(rawData, options) {
  rawData = _.map(rawData, item => ({
    date: item[options.dateColumn],
    dayNumber: item[options.dayNumberColumn],
    total: item[options.totalColumn],
    value: item[options.valueColumn],
  }));
  const sortedData = _.sortBy(rawData, r => r.date + parseInt(r.dayNumber, 10));
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
          !_.contains(columnNames, $scope.options.dayNumberColumn) ||
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

      $scope.currentTab = 'options';
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
    const defaultOptions = {
      timeInterval: 'daily',
    };

    VisualizationProvider.registerVisualization({
      type: 'COHORT',
      name: 'Cohort',
      renderTemplate: '<cohort-renderer options="visualization.options" query-result="queryResult"></cohort-renderer>',
      editorTemplate: editTemplate,
      defaultOptions,
    });
  });
}
