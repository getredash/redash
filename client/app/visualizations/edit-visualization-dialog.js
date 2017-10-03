import { pluck } from 'underscore';
import { copy } from 'angular';
import template from './edit-visualization-dialog.html';

const EditVisualizationDialog = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($window, currentUser, Events, Visualization, toastr) {
    'ngInject';

    this.query = this.resolve.query;
    this.queryResult = this.resolve.queryResult;
    this.originalVisualization = this.resolve.visualization;
    this.onNewSuccess = this.resolve.onNewSuccess;
    this.visualization = copy(this.originalVisualization);
    this.visTypes = Visualization.visualizationTypes;

    this.newVisualization = () =>
      ({
        type: Visualization.defaultVisualization.type,
        name: Visualization.defaultVisualization.name,
        description: '',
        options: Visualization.defaultVisualization.defaultOptions,
      });
    if (!this.visualization) {
      this.visualization = this.newVisualization();
    }

    this.typeChanged = (oldType) => {
      const type = this.visualization.type;
      // if not edited by user, set name to match type
      // todo: this is wrong, because he might have edited it before.
      if (type && oldType !== type && this.visualization && !this.visForm.name.$dirty) {
        this.visualization.name = Visualization.visualizations[this.visualization.type].name;
      }

      // Bring default options
      if (type && oldType !== type && this.visualization) {
        this.visualization.options =
          Visualization.visualizations[this.visualization.type].defaultOptions;
      }
    };

    this.submit = () => {
      if (this.visualization.id) {
        Events.record('update', 'visualization', this.visualization.id, { type: this.visualization.type });
      } else {
        Events.record('create', 'visualization', null, { type: this.visualization.type });
      }

      this.visualization.query_id = this.query.id;

      Visualization.save(this.visualization, (result) => {
        toastr.success('Visualization saved');

        const visIds = pluck(this.query.visualizations, 'id');
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
      }, () => {
        toastr.error('Visualization could not be saved');
      });
    };

    this.closeDialog = () => {
      if (this.visForm.$dirty) {
        if ($window.confirm('Are you sure you want to close the editor without saving?')) {
          this.close();
        }
      } else {
        this.close();
      }
    };
  },
};

export default function init(ngModule) {
  ngModule.component('editVisualizationDialog', EditVisualizationDialog);
}
