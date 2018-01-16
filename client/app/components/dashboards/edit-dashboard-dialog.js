import { isEmpty } from 'underscore';
import template from './edit-dashboard-dialog.html';

const EditDashboardDialog = {
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
  controller($rootScope, $location, $http, toastr, Events, Dashboard) {
    'ngInject';

    this.dashboard = this.resolve.dashboard;
    this.gridsterOptions = {
      margins: [5, 5],
      rowHeight: 100,
      colWidth: 260,
      columns: 2,
      mobileModeEnabled: false,
      swapping: true,
      minRows: 1,
      draggable: {
        enabled: true,
      },
      resizable: {
        enabled: false,
      },
    };

    this.isFormValid = () => !isEmpty(this.dashboard.name);

    this.saveDashboard = () => {
      this.saveInProgress = true;

      if (this.dashboard.id) {
        const request = {
          slug: this.dashboard.id,
          name: this.dashboard.name,
          version: this.dashboard.version,
          dashboard_filters_enabled: this.dashboard.dashboard_filters_enabled,
        };

        Dashboard.save(request, (dashboard) => {
          this.dashboard = dashboard;
          this.saveInProgress = false;
          this.close({ $value: this.dashboard });
          $rootScope.$broadcast('reloadDashboards');
        }, (error) => {
          this.saveInProgress = false;
          if (error.status === 403) {
            toastr.error('Unable to save dashboard: Permission denied.');
          } else if (error.status === 409) {
            toastr.error('It seems like the dashboard has been modified by another user. ' +
                'Please copy/backup your changes and reload this page.', { autoDismiss: false });
          }
        });
        Events.record('edit', 'dashboard', this.dashboard.id);
      } else {
        $http.post('api/dashboards', {
          name: this.dashboard.name,
        }).success((response) => {
          this.close();
          $location.path(`/dashboard/${response.slug}`).replace();
        });
        Events.record('create', 'dashboard');
      }
    };
  },
};

export default function init(ngModule) {
  ngModule.component('editDashboardDialog', EditDashboardDialog);
}
