import * as _ from 'underscore';
import template from './add-widget-dialog.html';

const AddWidgetDialog = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($sce, toastr, Query, Widget) {
    'ngInject';

    this.dashboard = this.resolve.dashboard;
    this.saveInProgress = false;
    this.selectedVis = null;
    this.query = {};
    this.selected_query = undefined;
    this.text = '';
    this.existing_text = '';
    this.new_text = '';
    this.isHidden = false;
    this.type = 'visualization';

    this.trustAsHtml = html => $sce.trustAsHtml(html);
    this.isVisualization = () => this.type === 'visualization';
    this.isTextBox = () => this.type === 'textbox';

    this.setType = (type) => {
      this.type = type;
    };

    this.onQuerySelect = () => {
      if (!this.query.selected) {
        return;
      }

      Query.get({ id: this.query.selected.id }, (query) => {
        if (query) {
          this.selected_query = query;
          if (query.visualizations.length) {
            this.selectedVis = query.visualizations[0];
          }
        }
      });
    };

    this.searchQueries = (term) => {
      if (!term || term.length < 3) {
        return;
      }

      Query.search({ q: term }, (results) => {
        this.queries = results;
      });
    };

    this.saveWidget = () => {
      this.saveInProgress = true;
      const widget = new Widget({
        visualization_id: this.selectedVis && this.selectedVis.id,
        dashboard_id: this.dashboard.id,
        options: {
          isHidden: this.isTextBox() && this.isHidden,
          position: {
            // Place new widget below all others
            col: 0,
            row: _.chain(this.dashboard.widgets)
              .map((w) => {
                let temp = _.extend({}, w.options);
                temp = _.extend({}, temp.position);
                const row = parseInt(temp.row, 10);
                const height = parseInt(temp.sizeY, 10);

                let result = 0;
                if (isFinite(row)) {
                  result += row;
                }
                if (isFinite(height)) {
                  result += height;
                }
                return result;
              })
              .max()
              .value(),
            // Auto-height by default
            sizeY: -1,
          },
        },
        text: this.text,
      });

      widget.$save().then((response) => {
        // update dashboard layout
        this.dashboard.version = response.version;
        this.dashboard.widgets.push(new Widget(response.widget));
        this.close();
      }).catch(() => {
        toastr.error('Widget can not be added');
      }).finally(() => {
        this.saveInProgress = false;
      });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('addWidgetDialog', AddWidgetDialog);
}
