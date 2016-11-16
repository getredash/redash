import dashboardPage from './dashboard';
import dashboardList from './dashboard-list';
import widgetComponent from './widget';
import addWidgetDialog from './add-widget-dialog';
import registerEditDashboardDialog from './edit-dashboard-dialog';

export default function (ngModule) {
  addWidgetDialog(ngModule);
  widgetComponent(ngModule);
  registerEditDashboardDialog(ngModule);
  return Object.assign({}, dashboardPage(ngModule), dashboardList(ngModule));
}