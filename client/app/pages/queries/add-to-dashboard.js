import template from './add-to-dashboard.html';

const AddToDashboardForm = {
  controller($sce, Dashboard, currentUser, toastr, Widget) {
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

      widget.save().then(() => {
        this.selectedDashboard = Dashboard.get({ slug: dash.slug }, () => {});
        this.close();
        toastr.success('Widget added to dashboard.');
      }).catch(() => {
        toastr.error('Widget not added.');
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
        user_id: currentUser.id, // limit_to_users_dashboards: limitToUsersDashboards,
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
