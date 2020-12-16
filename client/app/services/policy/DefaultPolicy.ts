import { get, isArray } from "lodash";
import { currentUser, clientConfig } from "@/services/auth";

/* eslint-disable class-methods-use-this */

export default class DefaultPolicy {
  refresh() {
    return Promise.resolve(this);
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'dashboardRefreshIntervals' does not exis... Remove this comment to see the full error message
    const result = clientConfig.dashboardRefreshIntervals;
    return isArray(result) ? result : null;
  }

  getQueryRefreshIntervals() {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'queryRefreshIntervals' does not exist on... Remove this comment to see the full error message
    const result = clientConfig.queryRefreshIntervals;
    return isArray(result) ? result : null;
  }

  canEdit(object: any) {
    return get(object, "can_edit", false);
  }

  canRun() {
    return true;
  }
}
