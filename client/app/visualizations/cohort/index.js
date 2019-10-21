/* global Cornelius */
import 'cornelius/src/cornelius';
import 'cornelius/src/cornelius.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import getOptions from './getOptions';
import Editor from './Editor';
import prepareData from './prepareData';

import './renderer.less';

const CohortRenderer = {
  bindings: {
    data: '<',
    options: '<',
  },
  template: '',
  replace: false,
  controller($scope, $element) {
    const update = () => {
      $element.empty().addClass('cohort-visualization-container');

      const { data, initialDate } = prepareData(this.data, this.options);
      if (data.length > 0) {
        Cornelius.draw({
          initialDate,
          container: $element[0],
          cohort: data,
          title: null,
          timeInterval: this.options.timeInterval,
          labels: {
            time: 'Time',
            people: 'Users',
            weekOf: 'Week of',
          },
        });
      }
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
