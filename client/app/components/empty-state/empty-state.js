import './empty-state.less';
import template from './empty-state.html';

const EmptyStateComponent = {
  template,
  replace: true,
  bindings: {
    icon: '@',
    title: '@',
    description: '@',
    illustration: '@',
    helpLink: '@',
    showAlertStep: '<',
    showDashboardStep: '<',
    showInviteStep: '<',
    onboardingMode: '<',
  },
  controller($uibModal, OrganizationStatus, currentUser) {
    this.isAdmin = currentUser.isAdmin;

    this.dataSourceStepCompleted = OrganizationStatus.objectCounters.data_sources > 0;
    this.queryStepCompleted = OrganizationStatus.objectCounters.queries > 0;
    this.dashboardStepCompleted = OrganizationStatus.objectCounters.dashboards > 0;
    this.alertStepCompleted = OrganizationStatus.objectCounters.alerts > 0;
    this.inviteStepCompleted = OrganizationStatus.objectCounters.users > 1;

    this.shouldShowOnboarding = () => {
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

init.init = true;
