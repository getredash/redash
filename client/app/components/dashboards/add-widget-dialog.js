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
          position: {},
        },
        text: this.text,
      });

      widget.$save()
        .then((response) => {
          // update dashboard layout
          this.dashboard.version = response.version;

          response.widget.options = _.extend(
            {},
            response.widget.options,
            { position: {} },
          );
          const w = new Widget(response.widget);

          const position = this.dashboard.calculateNewWidgetPosition(w);
          w.options.position.col = position.col;
          w.options.position.row = position.row;

          // Save it with new position
          return w.$save().then(() => w);
        })
        .then((w) => {
          this.dashboard.widgets.push(w);
          this.close();
        })
        .catch(() => {
          toastr.error('Widget can not be added');
        })
        .finally(() => {
          this.saveInProgress = false;
        });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('addWidgetDialog', AddWidgetDialog);
}
