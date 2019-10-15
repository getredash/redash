import React from 'react';
import { react2angular } from 'react2angular';

import Dropdown from 'antd/lib/dropdown';
import Button from 'antd/lib/button';
import Icon from 'antd/lib/icon';
import Menu from 'antd/lib/menu';
import Input from 'antd/lib/input';
import Tooltip from 'antd/lib/tooltip';

import DropdownFavorites from './components/FavoritesDropdown';
import { HelpTrigger } from '@/components/HelpTrigger';
import CreateDashboardDialog from '@/components/dashboards/CreateDashboardDialog';

import { currentUser, Auth, clientConfig } from '@/services/auth';
import { $location, $route } from '@/services/ng';
import navigateTo from '@/services/navigateTo';
import { Dashboard } from '@/services/dashboard';
import { Query } from '@/services/query';
import frontendVersion from '@/version.json';
import logoUrl from '@/assets/images/redash_icon_small.png';

import './AppHeader.less';

function onSearch(q) {
  $location.path('/queries').search({ q });
  $route.reload();
}


export function AppHeader() {
  return (
    <nav className="app-header">
      <div>
        <Menu mode="horizontal" selectable={false}>
          <Menu.Item key="dashboards" className="dropdown-menu-item">
            <Button onClick={() => navigateTo('dashboards')}>
              Dashboards
            </Button>
            <DropdownFavorites fetch={Dashboard.favorites} itemUrlFormat="dashboard/{slug}" />
          </Menu.Item>
          <Menu.Item key="queries" className="dropdown-menu-item">
            <Button onClick={() => navigateTo('queries')}>
              Queries
            </Button>
            <DropdownFavorites fetch={Query.favorites} itemUrlFormat={'queries/{id}'} />
          </Menu.Item>
          <Menu.Item key="alerts">
            <Button onClick={() => navigateTo('alerts')}>
              Alerts
            </Button>
          </Menu.Item>
        </Menu>
        <Dropdown
          trigger={['click']}
          overlay={(
            <Menu>
              {currentUser.hasPermission('create_query') && (
                <Menu.Item key="new-query">
                  <a href="queries/new">New Query</a>
                </Menu.Item>
              )}
              {currentUser.hasPermission('create_dashboard') && (
                <Menu.Item key="new-dashboard">
                  <a className="clickable" onClick={CreateDashboardDialog.showModal}>New Dashboard</a>
                </Menu.Item>
              )}
              <Menu.Item key="new-alert">
                <a href="alerts/new">New Alert</a>
              </Menu.Item>
            </Menu>
          )}
        >
          <Button type="primary" data-test="CreateButton">
              Create <Icon type="down" style={{ marginRight: 0 }} />
          </Button>
        </Dropdown>
      </div>
      <span className="header-logo">
        <a href={clientConfig.basePath}><img src={logoUrl} alt="Redash" /></a>
      </span>
      <div>
        <Input.Search
          className="searchbar"
          placeholder="Search queries..."
          data-test="AppHeaderSearch"
          onSearch={onSearch}
        />
        <Menu mode="horizontal" selectable={false}>
          <Menu.Item key="help">
            <HelpTrigger type="HOME" className="menu-item-button" />
          </Menu.Item>
          {currentUser.isAdmin && (
            <Menu.Item key="settings">
              <a href="data_sources" className="menu-item-button">
                <i className="fa fa-sliders" />
              </a>
            </Menu.Item>
          )}
          <Menu.Item key="profile">
            <Dropdown
              overlayStyle={{ minWidth: 200 }}
              placement="bottomRight"
              trigger={['click']}
              overlay={(
                <Menu>
                  <Menu.Item key="profile">
                    <a href="users/me">Edit Profile</a>
                  </Menu.Item>
                  {currentUser.hasPermission('super_admin') && (
                    <Menu.Divider />
                  )}
                  {currentUser.isAdmin && (
                    <Menu.Item key="datasources">
                      <a href="data_sources">Data Sources</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission('list_users') && (
                    <Menu.Item key="groups">
                      <a href="groups">Groups</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission('list_users') && (
                    <Menu.Item key="users">
                      <a href="users">Users</a>
                    </Menu.Item>
                  )}
                  <Menu.Item key="snippets">
                    <a href="query_snippets">Query Snippets</a>
                  </Menu.Item>
                  {currentUser.hasPermission('list_users') && (
                    <Menu.Item key="destinations">
                      <a href="destinations">Alert Destinations</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission('super_admin') && (
                    <Menu.Divider />
                  )}
                  {currentUser.hasPermission('super_admin') && (
                    <Menu.Item key="satus">
                      <a href="admin/status">System Status</a>
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item key="logout" onClick={Auth.logout}>Log out</Menu.Item>
                  <Menu.Divider />
                  <Menu.Item key="9" disabled>
                    Version: {clientConfig.version}
                    {frontendVersion !== clientConfig.version && (
                      <>{' '}({frontendVersion.substring(0, 8)})</>
                    )}
                    {clientConfig.newVersionAvailable && currentUser.hasPermission('super_admin') && (
                      <Tooltip title="Update Available" placement="rightTop">
                        {' '}
                        {/* eslint-disable-next-line react/jsx-no-target-blank */}
                        <a href="https://version.redash.io/" className="update-available" target="_blank" rel="noopener">
                          <i className="fa fa-arrow-circle-down" />
                        </a>
                      </Tooltip>
                    )}
                  </Menu.Item>
                </Menu>
)}
            >
              <Button data-test="ProfileDropdown">
                <img
                  className="profile-img"
                  src={currentUser.profile_image_url}
                  alt={currentUser.name}
                />
                {currentUser.name}
                <Icon type="down" />
              </Button>
            </Dropdown>
          </Menu.Item>
        </Menu>
      </div>
    </nav>
  );
}

export default function init(ngModule) {
  ngModule.component('appHeader', react2angular(AppHeader));
}

init.init = true;
