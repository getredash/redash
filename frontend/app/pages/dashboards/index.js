import dashboardPage from './dashboard';
import widgetComponent from './widget';
import addWidgetDialog from './add-widget-dialog';
import registerEditDashboardDialog from './edit-dashboard-dialog';

export default function (ngModule) {
  addWidgetDialog(ngModule);
  widgetComponent(ngModule);
  registerEditDashboardDialog(ngModule);
  return dashboardPage(ngModule);
}
