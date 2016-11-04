import dashboardPage from './dashboard';
import widgetComponent from './widget';

export default function (ngModule) {
  widgetComponent(ngModule);
  return dashboardPage(ngModule);
}
