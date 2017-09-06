import template from './add-to-dashboard.html';

const AddToDashboardForm = {
  controller($sce, Dashboard, currentUser, toastr, Query, Widget) {
    'ngInject';

    this.query = this.resolve.query;
    this.vis = this.resolve.vis;
    this.saveAddToDashbosard = this.resolve.saveAddToDashboard;
    this.saveInProgress = false;

    this.trustAsHtml = html => $sce.trustAsHtml(html);

    this.onDashboardSelected = (dash) => {
      // add widget to dashboard
      this.saveInProgress = true;
      this.widgetSize = 1;
      this.selectedVis = null;
      this.query = {};
      this.selected_query = this.query.id;
      this.type = 'visualization';
      this.isVisualization = () => this.type === 'visualization';

      const widget = new Widget({
        visualization_id: this.vis && this.vis.id,
        dashboard_id: dash.id,
        options: {},
        width: this.widgetSize,
        type: this.type,
      });

      // (response)
      widget.$save().then(() => {
        // (dashboard)
        this.selectedDashboard = Dashboard.get({ slug: dash.slug }, () => {});
        this.close();
      }).catch(() => {
        toastr.error('Widget can not be added');
      }).finally(() => {
        this.saveInProgress = false;
      });
    };

    this.selectedDashboard = null;

    this.searchDashboards = (term) => { // , limitToUsersDashboards
      if (!term || term.length < 3) {
        return;
      }

      Dashboard.search({
        q: term,
        user_id: currentUser.id,
        // limit_to_users_dashboards: limitToUsersDashboards,
        include_drafts: true,
      }, (results) => {
        this.dashboards = results;
      });
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

export default function (ngModule) {
  ngModule.component('addToDashboardDialog', AddToDashboardForm);
}
