import { extend, map, flatten } from "lodash";
import { Auth } from "@/services/auth";
import organizationStatus from "@/services/organizationStatus";

import adminJobsRoutes from "./admin/Jobs";
import adminOutdatedQueriesRoutes from "./admin/OutdatedQueries";
import adminSystemStatusRoutes from "./admin/SystemStatus";
import adminTasksRoutes from "./admin/Tasks";

import alertRoutes from "./alert/Alert";
import alertsListRoutes from "./alerts/AlertsList";
import dashboardListRoutes from "./dashboards/DashboardList";
import dashboardRoutes from "./dashboards/DashboardPage";
import publicDashboardRoutes from "./dashboards/PublicDashboardPage";
import dataSourcesListRoutes from "./data-sources/DataSourcesList";
import editDataSourceRoutes from "./data-sources/EditDataSource";
import destinationsListRoutes from "./destinations/DestinationsList";
import editDestinationRoutes from "./destinations/EditDestination";
import groupsListRoutes from "./groups/GroupsList";
import groupsDataSourcesRoutes from "./groups/GroupDataSources";
import groupsMembersRoutes from "./groups/GroupMembers";
import homeRoutes from "./home/Home";
import queriesListRoutes from "./queries-list/QueriesList";
import queryViewRoutes from "./queries/QueryView";
import querySourceRoutes from "./queries/QuerySource";
import visualizationEmbedRoutes from "./queries/VisualizationEmbed";
import querySnippetsRoutes from "./query-snippets/QuerySnippetsList";
import organizationSettingsRoutes from "./settings/OrganizationSettings";
import usersListRoutes from "./users/UsersList";
import userProfileRoutes from "./users/UserProfile";

function prepareRoutes(routes) {
  const resolveExtra = {
    __auth: () => Auth.requireSession(),
    __organizationStatus: () => organizationStatus.refresh(),
  };

  return map(flatten(routes), route => {
    route = extend(route, {
      authenticated: route.authenticated !== false, // could be set to `false` do disable auth
    });
    if (route.authenticated) {
      route.resolve = extend({}, route.resolve, resolveExtra);
    }
    return route;
  });
}

export default prepareRoutes([
  adminJobsRoutes,
  adminOutdatedQueriesRoutes,
  adminSystemStatusRoutes,
  adminTasksRoutes,
  alertRoutes,
  alertsListRoutes,
  dashboardListRoutes,
  dashboardRoutes,
  publicDashboardRoutes,
  dataSourcesListRoutes,
  editDataSourceRoutes,
  destinationsListRoutes,
  editDestinationRoutes,
  groupsListRoutes,
  groupsDataSourcesRoutes,
  groupsMembersRoutes,
  homeRoutes,
  queriesListRoutes,
  queryViewRoutes,
  querySourceRoutes,
  visualizationEmbedRoutes,
  querySnippetsRoutes,
  organizationSettingsRoutes,
  usersListRoutes,
  userProfileRoutes,
]);
