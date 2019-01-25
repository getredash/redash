import AbstractPolicy from './AbstractPolicy';
import DefaultPolicy from './DefaultPolicy';

class PolicyProxy extends AbstractPolicy {
  constructor(policy) {
    super();
    this.policy = policy;
  }

  get policy() {
    return this._policy;
  }
  set policy(policy) {
    this._policy = policy instanceof AbstractPolicy ? policy : null;
  }

  // Policy proxy methods

  get user() {
    return this.policy ? this.policy.user : super.user;
  }

  get organizationStatus() {
    return this.policy ? this.policy.organizationStatus : super.organizationStatus;
  }

  refresh() {
    return this.policy ? this.policy.refresh() : super.refresh();
  }

  canCreateDataSource() {
    return this.policy ? this.policy.canCreateDataSource : super.canCreateDataSource;
  }

  isCreateDataSourceEnabled() {
    return this.policy ? this.policy.isCreateDataSourceEnabled() : super.isCreateDataSourceEnabled();
  }

  canCreateDashboard() {
    return this.policy ? this.policy.canCreateDashboard() : super.canCreateDashboard();
  }

  isCreateDashboardEnabled() {
    return this.policy ? this.policy.isCreateDashboardEnabled() : super.isCreateDashboardEnabled();
  }

  canCreateAlert() {
    return this.policy ? this.policy.canCreateAlert() : super.canCreateAlert();
  }

  canCreateUser() {
    return this.policy ? this.policy.canCreateUser() : super.canCreateUser();
  }

  isCreateUserEnabled() {
    return this.policy ? this.policy.isCreateUserEnabled() : super.isCreateUserEnabled();
  }

  getDashboardRefreshIntervals() {
    return this.policy ? this.policy.getDashboardRefreshIntervals() : super.getDashboardRefreshIntervals();
  }

  getQueryRefreshIntervals() {
    return this.policy ? this.policy.getQueryRefreshIntervals() : super.getQueryRefreshIntervals();
  }
}

export default new PolicyProxy(new DefaultPolicy());
