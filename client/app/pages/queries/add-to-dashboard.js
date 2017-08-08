import template from './add-to-dashboard.html';

const AddToDashboardForm = {
  controller($sce, Dashboard, currentUser, toastr, Query, Widget) {
    'ngInject';

    this.query = this.resolve.query;
    this.saveAddToDashbosard = this.resolve.saveAddToDashboard;
    this.saveInProgress = false;

    this.trustAsHtml = html => $sce.trustAsHtml(html);

    this.onDashboardSelected = (dash) => {
      // console.log(dash);
      // add widget to dashboard
      this.saveInProgress = true;

      // this.dashboard = this.resolve.dashboard;
      // this.saveInProgress = false;
      this.widgetSize = 1;
      this.selectedVis = null;
      this.query = {};
      this.selected_query = this.query.id;

      this.type = 'visualization';
      this.isVisualization = () => this.type === 'visualization';

      // TODO handle multiple visualization queries

      // console.log(this.resolve.query);
      Query.get({ id: this.resolve.query.id }, (query) => {
        if (query) {
          this.selected_query = query;
          if (query.visualizations.length) {
            this.selectedVis = query.visualizations[0];
          }
        }
      });

      const widget = new Widget({
        visualization_id: this.selectedVis && this.selectedVis.id,
        dashboard_id: dash.id,
        options: {},
        width: this.widgetSize,
        type: this.type,
      });
      console.log(dash);
      console.log(widget);
      widget.$save().then((response) => {
        console.log(response);
        this.selectedDashboard = Dashboard.get({ slug: dash.slug });
        console.log(this.selectedDashboard);
        console.log(this.selectedDashboard.version);
        console.log(this.selectedDashboard.layout);
        console.log(this.selectedDashboard.widgets);
        // update dashboard layout
        this.selectedDashboard.layout = response.layout;
        this.selectedDashboard.version = response.version;
        const newWidget = new Widget(response.widget);
        if (response.new_row) {
          this.selectedDashboard.widgets.push([newWidget]);
        } else {
          this.selectedDashboard.widgets[this.selectedDashboard.widgets.length - 1].push(newWidget);
        }
        this.close();
      }).catch(() => {
        toastr.error('Widget can not be added');
      }).finally(() => {
        this.saveInProgress = false;
      });

      // TODO go to dashboard, preserving GET parameters
      this.dashboardPath = `/dashboards/${dash.slug}`;
      // $location.path(this.dashboardPath);
    };

    this.selectedDashboard = null;

    this.searchDashboards = (term, limitToUsersDashboards) => {
      if (!term || term.length < 3) {
        return;
      }

      Dashboard.search({
        q: term,
        user_id: currentUser.id,
        limit_to_users_dashboards: limitToUsersDashboards,
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
  },
  template,
};

export default function (ngModule) {
  ngModule.component('addToDashboardDialog', AddToDashboardForm);
}
