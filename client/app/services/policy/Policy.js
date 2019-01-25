export default class Policy {
  // eslint-disable-next-line class-methods-use-this
  _notImplemented() {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  get user() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  get organizationStatus() {
    return null;
  }

  refresh() {
    this._notImplemented();
  }

  canCreateDataSource() {
    this._notImplemented();
  }

  isCreateDataSourceEnabled() {
    this._notImplemented();
  }

  canCreateDashboard() {
    this._notImplemented();
  }

  isCreateDashboardEnabled() {
    this._notImplemented();
  }

  canCreateAlert() {
    this._notImplemented();
  }

  canCreateUser() {
    this._notImplemented();
  }

  isCreateUserEnabled() {
    this._notImplemented();
  }

  getDashboardRefreshIntervals() {
    this._notImplemented();
  }

  getQueryRefreshIntervals() {
    this._notImplemented();
  }
}
