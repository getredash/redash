import { merge, omit } from 'lodash';
import angular from 'angular';
import $ from 'jquery';
import 'pivottable';
import 'pivottable/dist/pivot.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import './pivot.less';

import Editor from './Editor';

const DEFAULT_OPTIONS = {
  controls: {
    enabled: false, // `false` means "show controls" o_O
  },
};

const PivotTableRenderer = {
  template: `
    <div class="pivot-table-renderer" ng-class="{'hide-controls': $ctrl.options.controls.enabled}"></div>
  `,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope, $element) {
    const update = () => {
      // We need to give the pivot table its own copy of the data, because it changes
      // it which interferes with other visualizations.
      const data = angular.copy(this.data.rows);
      const options = {
        renderers: $.pivotUtilities.renderers,
        onRefresh: (config) => {
          if (this.onOptionsChange) {
            config = omit(config, [
              // delete some values which are functions
              'aggregators',
              'renderers',
              'onRefresh',
              // delete some bulky de
              'localeStrings',
            ]);
            this.onOptionsChange(config);
          }
        },
        ...this.options,
      };

      $('.pivot-table-renderer', $element).pivotUI(data, options, true);
    };

    $scope.$watch('$ctrl.data', update);
    // `options.controls.enabled` is not related to pivot renderer, it's handled by `ng-if`,
    // so re-render only if other options changed
    $scope.$watch(() => omit(this.options, 'controls'), update, true);
  },
};

export default function init(ngModule) {
  ngModule.component('pivotTableRenderer', PivotTableRenderer);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'PIVOT',
      name: 'Pivot Table',
      getOptions: options => merge({}, DEFAULT_OPTIONS, options),
      Renderer: angular2react('pivotTableRenderer', PivotTableRenderer, $injector),
      Editor,

      defaultRows: 10,
      defaultColumns: 3,
      minColumns: 2,
    });
  });
}

init.init = true;
