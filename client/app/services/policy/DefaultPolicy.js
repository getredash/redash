import { isArray } from "lodash";
import { $q } from "@/services/ng";
import { currentUser, clientConfig } from "@/services/auth";

/* eslint-disable class-methods-use-this */

export default class DefaultPolicy {
  refresh() {
    return $q.resolve(this);
  }

  canCreateDataSource() {
    return currentUser.isAdmin;
  }

  isCreateDataSourceEnabled() {
    return currentUser.isAdmin;
  }

  canCreateDestination() {
    return currentUser.isAdmin;
  }

  isCreateDestinationEnabled() {
    return currentUser.isAdmin;
  }

  canCreateDashboard() {
    return currentUser.hasPermission("create_dashboard");
  }

  isCreateDashboardEnabled() {
    return currentUser.hasPermission("create_dashboard");
  }

  canCreateAlert() {
    return true;
  }

  canCreateUser() {
    return currentUser.isAdmin;
  }

  isCreateUserEnabled() {
    return currentUser.isAdmin;
  }

  isCreateQuerySnippetEnabled() {
    return true;
  }

  getDashboardRefreshIntervals() {
    const result = clientConfig.dashboardRefreshIntervals;
    return isArray(result) ? result : null;
  }

  getQueryRefreshIntervals() {
    const result = clientConfig.queryRefreshIntervals;
    return isArray(result) ? result : null;
  }
}
