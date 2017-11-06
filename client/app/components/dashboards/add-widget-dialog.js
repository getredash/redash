import * as _ from 'underscore';
import template from './add-widget-dialog.html';

const AddWidgetDialog = {
  template,
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  controller($sce, toastr, Query, Widget, dashboardGridOptions) {
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

      const width = dashboardGridOptions.defaultSizeX;

      // Find first free row for each column
      const bottomLine = _.chain(this.dashboard.widgets)
        .map((w) => {
          const options = _.extend({}, w.options);
          const position = _.extend({ row: 0, sizeY: 0 }, options.position);
          return {
            left: position.col,
            top: position.row,
            right: position.col + position.sizeX,
            bottom: position.row + position.sizeY,
            width: position.sizeX,
            height: position.sizeY,
          };
        })
        .reduce((result, item) => {
          const from = Math.max(item.left, 0);
          const to = Math.min(item.right, result.length + 1);
          for (let i = from; i < to; i += 1) {
            result[i] = Math.max(result[i], item.bottom);
          }
          return result;
        }, _.map(new Array(dashboardGridOptions.columns), _.constant(0)))
        .value();

      // Go through columns, pick them by count necessary to hold new block,
      // and calculate bottom-most free row per group.
      // Choose group with the top-most free row (comparing to other groups)
      const position = _.chain(_.range(0, dashboardGridOptions.columns - width + 1))
        .map(col => ({
          col,
          row: _.chain(bottomLine)
            .slice(col, col + width)
            .max()
            .value(),
        }))
        .sortBy('row')
        .first()
        .value();

      const widget = new Widget({
        visualization_id: this.selectedVis && this.selectedVis.id,
        dashboard_id: this.dashboard.id,
        options: {
          isHidden: this.isTextBox() && this.isHidden,
          position: {
            // Place new widget below all others
            col: position.col,
            row: position.row,
            sizeX: width,
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
