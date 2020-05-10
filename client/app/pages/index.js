import { flatten } from "lodash";

import adminJobsRoutes from "./admin/Jobs";
import adminOutdatedQueriesRoutes from "./admin/OutdatedQueries";
import adminSystemStatusRoutes from "./admin/SystemStatus";
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
import querySourceRoutes from "./queries/QuerySource";
import queryViewRoutes from "./queries/QueryView";
import visualizationEmbedRoutes from "./queries/VisualizationEmbed";
import queriesListRoutes from "./queries-list/QueriesList";
import querySnippetsRoutes from "./query-snippets/QuerySnippetsList";
import organizationSettingsRoutes from "./settings/OrganizationSettings";
import userProfileRoutes from "./users/UserProfile";
import usersListRoutes from "./users/UsersList";

export default flatten([
  adminJobsRoutes,
  adminOutdatedQueriesRoutes,
  adminSystemStatusRoutes,
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
