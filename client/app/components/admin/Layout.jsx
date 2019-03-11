import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { PageHeader } from '@/components/PageHeader';

export default function Layout({ activeTab, children }) {
  return (
    <div className="container">
      <PageHeader title="Admin" />

      <div className="bg-white tiled">
        <ul className="tab-nav">
          <li className={cx({ active: activeTab === 'system_status' })}>
            <a href="admin/status">System Status</a>
          </li>
          <li className={cx({ active: activeTab === 'tasks' })}>
            <a href="admin/queries/tasks">Celery Status</a>
          </li>
          <li className={cx({ active: activeTab === 'outdated_queries' })}>
            <a href="admin/queries/outdated">Outdated Queries</a>
          </li>
        </ul>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

Layout.propTypes = {
  activeTab: PropTypes.string,
  children: PropTypes.node,
};

Layout.defaultProps = {
  activeTab: 'system_status',
  children: null,
};
