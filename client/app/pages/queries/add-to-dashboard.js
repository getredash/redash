import template from './add-to-dashboard.html';
import notification from '@/services/notification';

const AddToDashboardForm = {
  controller($sce, Dashboard, currentUser, Widget) {
    'ngInject';

    this.vis = this.resolve.vis;
    this.saveInProgress = false;
    this.trustAsHtml = html => $sce.trustAsHtml(html);
    this.onDashboardSelected = ({ slug }) => {
      this.saveInProgress = true;
      this.selected_query = this.resolve.query.id;
      // Load dashboard with all widgets
      Dashboard.get({ slug }).$promise
        .then((dashboard) => {
          const widget = new Widget({
            visualization_id: this.vis && this.vis.id,
            dashboard_id: dashboard.id,
            options: {
              isHidden: false,
              position: {},
            },
            width: 1,
            type: 'visualization',
            visualization: this.vis, // `Widget` constructor uses it to compute default dimensions based on viz config
          });

          const position = dashboard.calculateNewWidgetPosition(widget);
          widget.options.position.col = position.col;
          widget.options.position.row = position.row;

          return widget.save();
        })
        .then(() => {
          this.close();
          notification.success('Widget added to dashboard.');
        })
        .catch(() => {
          notification.error('Widget not added.');
        })
        .finally(() => {
          this.saveInProgress = false;
        });
    };
    this.selectedDashboard = null;
    this.searchDashboards = (searchTerm) => {
      // , limitToUsersDashboards
      if (!searchTerm || searchTerm.length < 3) {
        return;
      }
      Dashboard.get(
        {
          search_term: searchTerm,
        },
        (results) => {
          this.dashboards = results.results;
        },
      );
    };
  },
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
    vis: '<',
  },
  template,
};
export default function init(ngModule) {
  ngModule.component('addToDashboardDialog', AddToDashboardForm);
}

init.init = true;
