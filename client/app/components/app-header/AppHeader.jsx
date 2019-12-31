/* eslint-disable no-template-curly-in-string */

import React, { useRef } from "react";

import Dropdown from "antd/lib/dropdown";
import Button from "antd/lib/button";
import Icon from "antd/lib/icon";
import Menu from "antd/lib/menu";
import Input from "antd/lib/input";
import Tooltip from "antd/lib/tooltip";

import FavoritesDropdown from "./components/FavoritesDropdown";
import HelpTrigger from "@/components/HelpTrigger";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";

import { currentUser, Auth, clientConfig } from "@/services/auth";
import { $location, $route } from "@/services/ng";
import { Dashboard } from "@/services/dashboard";
import { Query } from "@/services/query";
import frontendVersion from "@/version.json";
import logoUrl from "@/assets/images/redash_icon_small.png";

import "./AppHeader.less";

function onSearch(q) {
  $location.path("/queries").search({ q });
  $route.reload();
}

function DesktopNavbar() {
  return (
    <div className="app-header" data-platform="desktop">
      <div>
        <Menu mode="horizontal" selectable={false}>
          {currentUser.hasPermission("list_dashboards") && (
            <Menu.Item key="dashboards" className="dropdown-menu-item">
              <Button href="dashboards">Dashboards</Button>
              <FavoritesDropdown fetch={Dashboard.favorites} urlTemplate="dashboard/${slug}" />
            </Menu.Item>
          )}
          {currentUser.hasPermission("view_query") && (
            <Menu.Item key="queries" className="dropdown-menu-item">
              <Button href="queries">Queries</Button>
              <FavoritesDropdown fetch={Query.favorites} urlTemplate="queries/${id}" />
            </Menu.Item>
          )}
          {currentUser.hasPermission("list_alerts") && (
            <Menu.Item key="alerts">
              <Button href="alerts">Alerts</Button>
            </Menu.Item>
          )}
        </Menu>
        {currentUser.canCreate() && (
          <Dropdown
            trigger={["click"]}
            overlay={
              <Menu>
                {currentUser.hasPermission("create_query") && (
                  <Menu.Item key="new-query">
                    <a href="queries/new">New Query</a>
                  </Menu.Item>
                )}
                {currentUser.hasPermission("create_dashboard") && (
                  <Menu.Item key="new-dashboard">
                    <a onMouseUp={() => CreateDashboardDialog.showModal()}>New Dashboard</a>
                  </Menu.Item>
                )}
                {currentUser.hasPermission("list_alerts") && (
                  <Menu.Item key="new-alert">
                    <a href="alerts/new">New Alert</a>
                  </Menu.Item>
                )}
              </Menu>
            }>
            <Button type="primary" data-test="CreateButton">
              Create <Icon type="down" />
            </Button>
          </Dropdown>
        )}
      </div>
      <div className="header-logo">
        <a href="./">
          <img src={logoUrl} alt="Redash" />
        </a>
      </div>
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
              <Tooltip title="Settings">
                <Button href="data_sources" className="menu-item-button">
                  <i className="fa fa-sliders" />
                </Button>
              </Tooltip>
            </Menu.Item>
          )}
          <Menu.Item key="profile">
            <Dropdown
              overlayStyle={{ minWidth: 200 }}
              placement="bottomRight"
              trigger={["click"]}
              overlay={
                <Menu>
                  <Menu.Item key="profile">
                    <a href="users/me">Edit Profile</a>
                  </Menu.Item>
                  {currentUser.hasPermission("super_admin") && <Menu.Divider />}
                  {currentUser.isAdmin && (
                    <Menu.Item key="datasources">
                      <a href="data_sources">Data Sources</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission("list_users") && (
                    <Menu.Item key="groups">
                      <a href="groups">Groups</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission("list_users") && (
                    <Menu.Item key="users">
                      <a href="users">Users</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission("create_query") && (
                    <Menu.Item key="snippets">
                      <a href="query_snippets">Query Snippets</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission("list_users") && (
                    <Menu.Item key="destinations">
                      <a href="destinations">Alert Destinations</a>
                    </Menu.Item>
                  )}
                  {currentUser.hasPermission("super_admin") && <Menu.Divider />}
                  {currentUser.hasPermission("super_admin") && (
                    <Menu.Item key="status">
                      <a href="admin/status">System Status</a>
                    </Menu.Item>
                  )}
                  <Menu.Divider />
                  <Menu.Item key="logout" onClick={() => Auth.logout()}>
                    Log out
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item key="version" disabled>
                    Version: {clientConfig.version}
                    {frontendVersion !== clientConfig.version && ` (${frontendVersion.substring(0, 8)})`}
                    {clientConfig.newVersionAvailable && currentUser.hasPermission("super_admin") && (
                      <Tooltip title="Update Available" placement="rightTop">
                        {" "}
                        {/* eslint-disable react/jsx-no-target-blank */}
                        <a
                          href="https://version.redash.io/"
                          className="update-available"
                          target="_blank"
                          rel="noopener">
                          <i className="fa fa-arrow-circle-down" />
                        </a>
                      </Tooltip>
                    )}
                  </Menu.Item>
                </Menu>
              }>
              <Button data-test="ProfileDropdown" className="profile-dropdown">
                <img src={currentUser.profile_image_url} alt={currentUser.name} />
                <span>{currentUser.name}</span>
                <Icon type="down" />
              </Button>
            </Dropdown>
          </Menu.Item>
        </Menu>
      </div>
    </div>
  );
}

function MobileNavbar() {
  const ref = useRef();

  return (
    <div className="app-header" data-platform="mobile" ref={ref}>
      <div className="header-logo">
        <a href="./">
          <img src={logoUrl} alt="Redash" />
        </a>
      </div>
      <div>
        <Dropdown
          overlayStyle={{ minWidth: 200 }}
          trigger={["click"]}
          getPopupContainer={() => ref.current} // so the overlay menu stays with the fixed header when page scrolls
          overlay={
            <Menu mode="vertical" selectable={false}>
              {currentUser.hasPermission("list_dashboards") && (
                <Menu.Item key="dashboards">
                  <a href="dashboards">Dashboards</a>
                </Menu.Item>
              )}
              {currentUser.hasPermission("view_query") && (
                <Menu.Item key="queries">
                  <a href="queries">Queries</a>
                </Menu.Item>
              )}
              {currentUser.hasPermission("list_alerts") && (
                <Menu.Item key="alerts">
                  <a href="alerts">Alerts</a>
                </Menu.Item>
              )}
              <Menu.Item key="profile">
                <a href="users/me">Edit Profile</a>
              </Menu.Item>
              <Menu.Divider />
              {currentUser.isAdmin && (
                <Menu.Item key="settings">
                  <a href="data_sources">Settings</a>
                </Menu.Item>
              )}
              {currentUser.hasPermission("super_admin") && (
                <Menu.Item key="status">
                  <a href="admin/status">System Status</a>
                </Menu.Item>
              )}
              {currentUser.hasPermission("super_admin") && <Menu.Divider />}
              <Menu.Item key="help">
                {/* eslint-disable-next-line react/jsx-no-target-blank */}
                <a href="https://redash.io/help" target="_blank" rel="noopener">
                  Help
                </a>
              </Menu.Item>
              <Menu.Item key="logout" onClick={() => Auth.logout()}>
                Log out
              </Menu.Item>
            </Menu>
          }>
          <Button>
            <Icon type="menu" />
          </Button>
        </Dropdown>
      </div>
    </div>
  );
}

export default function AppHeader() {
  return (
    <nav className="app-header-wrapper">
      <DesktopNavbar />
      <MobileNavbar />
    </nav>
  );
}
