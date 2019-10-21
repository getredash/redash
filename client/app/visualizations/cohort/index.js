/* global Cornelius */
import { map, includes } from 'lodash';
import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import getOptions from './getOptions';
import Editor from './Editor';
import prepareData from './prepareData';

const CohortRenderer = {
  bindings: {
    data: '<',
    options: '<',
  },
  template: '',
  replace: false,
  controller($scope, $element) {
    const update = () => {
      $element.empty();

      if (this.data.rows.length === 0) {
        return;
      }

      const options = this.options;

      const columnNames = map(this.data.columns, c => c.name);
      if (
        !includes(columnNames, options.dateColumn) ||
        !includes(columnNames, options.stageColumn) ||
        !includes(columnNames, options.totalColumn) ||
        !includes(columnNames, options.valueColumn)
      ) {
        return;
      }

      const { data, initialDate } = prepareData(this.data.rows, options);

      Cornelius.draw({
        initialDate,
        container: $element[0],
        cohort: data,
        title: null,
        timeInterval: options.timeInterval,
        labels: {
          time: 'Time',
          people: 'Users',
          weekOf: 'Week of',
        },
      });
    };

    $scope.$watch('$ctrl.data', update);
    $scope.$watch('$ctrl.options', update, true);
  },
};

export default function init(ngModule) {
  ngModule.component('cohortRenderer', CohortRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'COHORT',
      name: 'Cohort',
      getOptions,
      Renderer: angular2react('cohortRenderer', CohortRenderer, $injector),
      Editor,

      autoHeight: true,
      defaultRows: 8,
    });
  });
}

init.init = true;
