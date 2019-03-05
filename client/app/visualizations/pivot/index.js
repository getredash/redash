import { merge, omit } from 'lodash';
import angular from 'angular';
import $ from 'jquery';
import 'pivottable';
import 'pivottable/dist/pivot.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import editorTemplate from './pivottable-editor.html';
import './pivot.less';

const DEFAULT_OPTIONS = {
  defaultRows: 10,
  defaultColumns: 3,
  minColumns: 2,
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
    $scope.$watch('$ctrl.options', update, true);
  },
};

const PivotTableEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('pivotTableRenderer', PivotTableRenderer);
  ngModule.component('pivotTableEditor', PivotTableEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'PIVOT',
      name: 'Pivot Table',
      getOptions: options => merge({}, DEFAULT_OPTIONS, options),
      Renderer: angular2react('pivotTableRenderer', PivotTableRenderer, $injector),
      Editor: angular2react('pivotTableEditor', PivotTableEditor, $injector),
    });
  });
}

init.init = true;
