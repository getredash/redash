import organizationStatus from '@/services/organizationStatus';
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
  controller($uibModal, currentUser) {
    this.isAdmin = currentUser.isAdmin;

    this.dataSourceStepCompleted = organizationStatus.objectCounters.data_sources > 0;
    this.queryStepCompleted = organizationStatus.objectCounters.queries > 0;
    this.dashboardStepCompleted = organizationStatus.objectCounters.dashboards > 0;
    this.alertStepCompleted = organizationStatus.objectCounters.alerts > 0;
    this.inviteStepCompleted = organizationStatus.objectCounters.users > 1;

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
