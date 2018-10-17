import { map } from 'lodash';
import { copy } from 'angular';
import template from './edit-visualization-dialog.html';
import visualizationRegistry from './registry';

export default {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($window, currentUser, Events, Visualization, toastr, $scope) {
    'ngInject';

    this.query = this.resolve.query;
    this.queryResult = this.resolve.queryResult;
    this.data = { rows: this.queryResult.getData(), columns: this.queryResult.getColumns() };
    this.originalVisualization = this.resolve.visualization;
    this.onNewSuccess = this.resolve.onNewSuccess;
    this.visualization = copy(this.originalVisualization);
    this.setFilters = (f) => { this.query.filters = f; };
    this.updateVisualization = v => $scope.$apply(() => { this.$dirty = true; this.visualization = v; });
    this.$dirty = false;
    this.newVisualization = () => ({
      type: 'CHART',
      name: visualizationRegistry.CHART.name,
      description: '',
      options: visualizationRegistry.CHART.defaultOptions,
    });
    if (!this.visualization) {
      this.visualization = this.newVisualization();
    }

    this.submit = () => {
      if (this.visualization.id) {
        Events.record('update', 'visualization', this.visualization.id, { type: this.visualization.type });
      } else {
        Events.record('create', 'visualization', null, { type: this.visualization.type });
      }

      this.visualization.query_id = this.query.id;

      Visualization.save(
        this.visualization,
        (result) => {
          toastr.success('Visualization saved');

          const visIds = map(this.query.visualizations, i => i.id);
          const index = visIds.indexOf(result.id);
          if (index > -1) {
            this.query.visualizations[index] = result;
          } else {
            // new visualization
            this.query.visualizations.push(result);
            if (this.onNewSuccess) {
              this.onNewSuccess(result);
            }
          }
          this.close();
        },
        () => {
          toastr.error('Visualization could not be saved');
        },
      );
    };

    this.closeDialog = () => {
      if (this.$dirty) {
        if ($window.confirm('Are you sure you want to close the editor without saving?')) {
          this.close();
        }
      } else {
        this.close();
      }
    };
  },
};
