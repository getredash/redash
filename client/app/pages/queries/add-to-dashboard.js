import template from './add-to-dashboard.html';
import notification from '@/services/notification';

const AddToDashboardForm = {
  controller($sce, Dashboard, currentUser, Widget) {
    'ngInject';

    this.vis = this.resolve.vis;
    this.saveInProgress = false;
    this.trustAsHtml = html => $sce.trustAsHtml(html);
    this.onDashboardSelected = (dash) => {
      this.saveInProgress = true;
      this.selected_query = this.resolve.query.id;
      const widget = new Widget({
        visualization_id: this.vis && this.vis.id,
        dashboard_id: dash.id,
        options: {},
        width: 1,
        type: 'visualization',
      });
      widget
        .save()
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
