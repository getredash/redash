import { react2angular } from 'react2angular';
import CeleryStatus from '@/components/admin/CeleryStatus';
import template from './tasks.html';

function TasksCtrl(Events) {
  Events.record('view', 'page', 'admin/tasks');
}

export default function init(ngModule) {
  ngModule.component('adminCeleryStatus', react2angular(CeleryStatus));
  ngModule.component('tasksPage', {
    template,
    controller: TasksCtrl,
  });

  return {
    '/admin/queries/tasks': {
      template: '<tasks-page></tasks-page>',
      title: 'Celery Status',
    },
  };
}

init.init = true;
