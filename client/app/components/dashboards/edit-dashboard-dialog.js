import { isEmpty } from 'underscore';
import template from './edit-dashboard-dialog.html';

const EditDashboardDialog = {
  bindings: {
    resolve: '<',
    close: '&',
    dismiss: '&',
  },
  template,
  controller($rootScope, $location, $http, toastr, Events) {
    'ngInject';

    this.dashboard = this.resolve.dashboard;

    this.isFormValid = () => !isEmpty(this.dashboard.name);

    this.saveDashboard = () => {
      this.saveInProgress = true;

      $http
        .post('api/dashboards', {
          name: this.dashboard.name,
        })
        .success((response) => {
          this.close();
          $location
            .path(`/dashboard/${response.slug}`)
            .search('edit')
            .replace();
        });
      Events.record('create', 'dashboard');
    };
  },
};

export default function init(ngModule) {
  ngModule.component('editDashboardDialog', EditDashboardDialog);
}
