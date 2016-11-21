/* global Cornelius */
import _ from 'underscore';
import moment from 'moment';
import angular from 'angular';
import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';

import editorTemplate from './cohort-editor.html';

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

        const sortedData = _.sortBy($scope.queryResult.getData(), r =>
           r.date + r.day_number
        );

        const grouped = _.groupBy(sortedData, 'date');

        const maxColumns = _.reduce(grouped, (memo, data) =>
           ((data.length > memo) ? data.length : memo)
        , 0);

        const data = _.map(grouped, (values) => {
          const row = [values[0].total];
          _.each(values, (value) => {
            row.push(value.value);
          });
          _.each(_.range(values.length, maxColumns), () => {
            row.push(null);
          });
          return row;
        });

        const initialDate = moment(sortedData[0].date).toDate();
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

export default function (ngModule) {
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
