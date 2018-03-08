import './empty-state.less';
import template from './empty-state.html';

const EmptyStateComponent = {
  template,
  replace: true,
  bindings: {
    icon: '@',
    title: '@',
    description: '@',
    helpLink: '@',
    showAlertStep: '<',
    showDashboardStep: '<',
    showInviteStep: '<',
    onboardingMode: '<',
  },
  controller($http, $uibModal, currentUser) {
    this.loading = true;
    this.isAdmin = currentUser.isAdmin;

    $http.get('api/organization/status').then((response) => {
      this.loading = false;

      const counters = response.data.object_counters;
      this.dataSourceStepCompleted = counters.data_sources > 0;
      this.queryStepCompleted = counters.queries > 0;
      this.dashboardStepCompleted = counters.dashboards > 0;
      this.alertStepCompleted = counters.alerts > 0;
      this.inviteStepCompleted = counters.users > 1;
    });

    this.shouldShowOnboarding = () => {
      if (this.loading) {
        return false;
      }

      if (!this.onboardingMode) {
        return true;
      }

      return !(
        this.dataSourceStepCompleted &&
        this.queryStepCompleted &&
        this.dashboardStepCompleted &&
        this.inviteStepCompleted
      );
    };

    this.newDashboard = () => {
      $uibModal.open({
        component: 'editDashboardDialog',
        resolve: {
          dashboard: () => ({ name: null, layout: null }),
        },
      });
    };
  },
};

export default function init(ngModule) {
  ngModule.component('emptyState', EmptyStateComponent);
}
