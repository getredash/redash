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
  },
  controller() {
  },
};

export default function init(ngModule) {
  ngModule.component('emptyState', EmptyStateComponent);
}
