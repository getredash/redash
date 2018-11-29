import { react2angular } from 'react2angular';
import ModelTagsControl from '@/components/tags-control/ModelTagsControl';

export class QueryTagsControl extends ModelTagsControl {
  static archivedTooltip = 'This query is archived and can\'t be used in dashboards, and won\'t appear in search results.';
}

export default function init(ngModule) {
  ngModule.component('queryTagsControl', react2angular(QueryTagsControl, null, ['$uibModal']));
}

init.init = true;
