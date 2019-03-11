import React from 'react';
import { react2angular } from 'react2angular';

import Layout from '@/components/admin/Layout';
import CeleryStatus from '@/components/admin/CeleryStatus';

import recordEvent from '@/services/recordEvent';
import { routesToAngularRoutes } from '@/lib/utils';

class Tasks extends React.Component {
  componentDidMount() {
    recordEvent('view', 'page', 'admin/tasks');
  }

  render() {
    return (
      <Layout activeTab="tasks">
        <CeleryStatus />
      </Layout>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageTasks', react2angular(Tasks));

  return routesToAngularRoutes([
    {
      path: '/admin/queries/tasks',
      title: 'Celery Status',
      key: 'tasks',
    },
  ], {
    template: '<page-tasks></page-tasks>',
  });
}

init.init = true;
