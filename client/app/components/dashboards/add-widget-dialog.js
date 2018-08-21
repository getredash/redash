import { debounce } from 'lodash';
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

    this.selectedQuery = null;
    this.searchTerm = '';
    this.recentQueries = [];

    // Don't show draft (unpublished) queries
    Query.recent().$promise.then((items) => {
      this.recentQueries = items.filter(item => !item.is_draft);
    });

    this.searchedQueries = [];
    this.selectedVis = null;

    this.trustAsHtml = html => $sce.trustAsHtml(html);

    this.selectQuery = (queryId) => {
      // Clear previously selected query (if any)
      this.selectedQuery = null;
      this.selectedVis = null;

      if (queryId) {
        Query.get({ id: queryId }, (query) => {
          if (query) {
            this.selectedQuery = query;
            if (query.visualizations.length) {
              this.selectedVis = query.visualizations[0];
            }
          }
        });
      }
    };

    // `ng-model-options` does not work with `ng-change`, so do debounce here
    this.searchQueries = debounce((term) => {
      if (!term || term.length === 0) {
        this.searchedQueries = [];
        return;
      }

      Query.query({ q: term }, (results) => {
        // If user will type too quick - it's possible that there will be
        // several requests running simultaneously. So we need to check
        // which results are matching current search term and ignore
        // outdated results.
        if (this.searchTerm === term) {
          this.searchedQueries = results.results;
        }
      });
    }, 200);

    this.saveWidget = () => {
      this.saveInProgress = true;

      const widget = new Widget({
        visualization_id: this.selectedVis && this.selectedVis.id,
        dashboard_id: this.dashboard.id,
        options: {
          isHidden: false,
          position: {},
        },
        visualization: this.selectedVis,
        text: '',
      });

      const position = this.dashboard.calculateNewWidgetPosition(widget);
      widget.options.position.col = position.col;
      widget.options.position.row = position.row;

      widget
        .save()
        .then(() => {
          this.dashboard.widgets.push(widget);
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
