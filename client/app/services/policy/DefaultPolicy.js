import { isArray } from 'lodash';
import { $q } from '@/services/ng';
import { currentUser, clientConfig } from '@/services/auth';
import organizationStatus from '@/services/organizationStatus';
import Policy from './Policy';

export default class DefaultPolicy extends Policy {
  // eslint-disable-next-line class-methods-use-this
  get user() {
    return currentUser;
  }

  // eslint-disable-next-line class-methods-use-this
  get organizationStatus() {
    return organizationStatus;
  }

  refresh() {
    return $q.resolve(this);
  }

  canCreateDataSource() {
    return this.user.isAdmin;
  }

  isCreateDataSourceEnabled() {
    return this.user.isAdmin;
  }

  canCreateDashboard() {
    return this.user.hasPermission('create_dashboard');
  }

  isCreateDashboardEnabled() {
    return this.user.hasPermission('create_dashboard');
  }

  // eslint-disable-next-line class-methods-use-this
  canCreateAlert() {
    return true;
  }

  canCreateUser() {
    return this.user.isAdmin;
  }

  isCreateUserEnabled() {
    return this.user.isAdmin;
  }

  // eslint-disable-next-line class-methods-use-this
  getDashboardRefreshIntervals() {
    const result = clientConfig.dashboardRefreshIntervals;
    return isArray(result) ? result : null;
  }

  // eslint-disable-next-line class-methods-use-this
  getQueryRefreshIntervals() {
    const result = clientConfig.queryRefreshIntervals;
    return isArray(result) ? result : null;
  }
}
