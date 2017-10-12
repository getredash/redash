/* global Cornelius */
import _ from 'underscore';
import moment from 'moment';
import angular from 'angular';
import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';

import editorTemplate from './cohort-editor.html';

const momentInterval = {
  weekly: 'weeks',
  daily: 'days',
  monthly: 'months',
};

function prepareData(rawData, timeInterval) {
  const sortedData = _.sortBy(rawData, r => r.date + parseInt(r.day_number, 10));
  const grouped = _.groupBy(sortedData, 'date');
  const initialDate = moment(sortedData[0].date).toDate();
  const lastDate = moment(sortedData[sortedData.length - 1].date);
  const zeroBased = _.min(_.pluck(rawData, 'day_number')) === 0;

  let previousDay = null;
  const data = [];

  _.each(grouped, (values) => {
    if (previousDay !== null) {
      let diff = Math.abs(previousDay.diff(values[0].date, momentInterval[timeInterval]));
      while (diff > 1) {
        data.push([0]);
        diff -= 1;
      }
    }

    previousDay = moment(values[0].date);

    const row = [parseInt(values[0].total, 10)];
    let maxDays = lastDate.diff(moment(values[0].date), momentInterval[timeInterval]);
    if (zeroBased) {
      maxDays += 1;
    }

    _.each(values, (value) => {
      const index = zeroBased ? value.day_number + 1 : value.day_number;
      row[index] = parseInt(value.value, 10);
    });

    for (let i = 0; i <= maxDays; i += 1) {
      if (row[i] === undefined) {
        row[i] = 0;
      }
    }

    data.push(row);
  });

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
      $scope.options.timeInterval = $scope.options.timeInterval || 'daily';

      function updateCohort() {
        if ($scope.queryResult.getData() === null) {
          return;
        }

        const { data, initialDate } = prepareData(
          $scope.queryResult.getData(),
          $scope.options.timeInterval,
        );

        const container = angular.element(element)[0];

        Cornelius.draw({
          initialDate,
          container,
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
      $scope.$watch('options.timeInterval', updateCohort);
    },
  };
}

function cohortEditor() {
  return {
    restrict: 'E',
    template: editorTemplate,
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
