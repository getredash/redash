import { react2angular } from 'react2angular';
import ModelTagsControl from '@/components/tags-control/ModelTagsControl';

export class DashboardTagsControl extends ModelTagsControl {
  static archivedTooltip = 'This dashboard is archived and and won\'t appear in the dashboards list or search results.';
}

export default function init(ngModule) {
  ngModule.component('dashboardTagsControl', react2angular(DashboardTagsControl, null, ['$uibModal']));
}

init.init = true;
