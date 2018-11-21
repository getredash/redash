import { isFunction, isArray } from 'lodash';

export class Policy {
  constructor($injector) {
    this.$injector = $injector;
  }

  get user() {
    return this.$injector.get('currentUser');
  }

  get organizationStatus() {
    return this.$injector.get('OrganizationStatus');
  }

  refresh() {
    const $q = this.$injector.get('$q');
    return $q.resolve(this);
  }

  canCreateDataSource() {
    return this.user.hasPermission('admin');
  }

  isCreateDataSourceEnabled() {
    return this.user.hasPermission('admin');
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
    return this.user.hasPermission('admin');
  }

  isCreateUserEnabled() {
    return this.user.hasPermission('admin');
  }

  getDashboardRefreshIntervals() {
    const clientConfig = this.$injector.get('clientConfig');
    const result = clientConfig.dashboardRefreshIntervals;
    return isArray(result) ? result : null;
  }

  getQueryRefreshIntervals() {
    const clientConfig = this.$injector.get('clientConfig');
    const result = clientConfig.queryRefreshIntervals;
    return isArray(result) ? result : null;
  }
}

export default function init(ngModule) {
  let appInjector = null;

  ngModule.run(($injector) => {
    'ngInject';

    appInjector = $injector;
  });

  ngModule.provider('Policy', function policyProvider() {
    let PolicyClass = Policy;

    this.setPolicyClass = (policyClass) => {
      PolicyClass = policyClass;
    };

    this.$get = () => (isFunction(PolicyClass) ? new PolicyClass(appInjector) : null);
  });
}

init.init = true;

