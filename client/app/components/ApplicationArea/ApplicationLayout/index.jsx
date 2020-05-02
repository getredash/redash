import React, { useState } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Menu from "antd/lib/menu";
import Icon from "antd/lib/icon";
import HelpTrigger from "@/components/HelpTrigger";
import { Auth, currentUser } from "@/services/auth";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import logoUrl from "@/assets/images/redash_icon_small.png";

import ApplicationHeader from "../ApplicationHeader";

import "./index.less";

export default function ApplicationLayout({ children }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <React.Fragment>
      <div className="application-layout-menu">
        <div className="header-logo">
          <a href="./">
            <img src={logoUrl} alt="Redash" style={{ height: collapsed ? "20px" : "40px" }} />
          </a>
        </div>
        <Menu mode="inline" selectable={false} inlineCollapsed={collapsed} theme="dark">
          {/* <Menu.Item key="home" className="header-logo">
            <a href="./">
              <img src={logoUrl} alt="Redash" />
            </a>
          </Menu.Item> */}

          {currentUser.hasPermission("list_dashboards") && (
            <Menu.Item key="dashboards">
              <a href="dashboards">
                <Icon type="desktop" />
                <span>Dashboards</span>
              </a>
            </Menu.Item>
          )}
          {currentUser.hasPermission("view_query") && (
            <Menu.Item key="queries">
              <a href="queries">
                <Icon type="code" />
                <span>Queries</span>
              </a>
            </Menu.Item>
          )}
          {currentUser.hasPermission("list_alerts") && (
            <Menu.Item key="alerts">
              <a href="alerts">
                <Icon type="alert" />
                <span>Alerts</span>
              </a>
            </Menu.Item>
          )}

          <Menu.Divider />
        </Menu>

        <Menu mode="inline" inlineCollapsed={true} theme="dark" className="create-menu menu-inline-icon-only">
          <Menu.SubMenu
            key="create"
            title={
              <span>
                <Icon type="plus"></Icon>
              </span>
            }>
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
          </Menu.SubMenu>
        </Menu>
        <Menu mode="inline" selectable={false} inlineCollapsed={collapsed} theme="dark">
          <Menu.Item key="help">
            <HelpTrigger showTooltip={false} type="HOME">
              <Icon type="question-circle" />
              <span>Help</span>
            </HelpTrigger>
          </Menu.Item>
          {currentUser.isAdmin && (
            <Menu.Item key="settings">
              <a href="data_sources">
                <Icon type="setting" />
                <span>Settings</span>
              </a>
            </Menu.Item>
          )}
          <Menu.Divider />
        </Menu>
        <Menu mode="vertical" theme="dark">
          <Menu.SubMenu
            key="profile"
            title={
              <span>
                <img className="profile__image_thumb" src={currentUser.profile_image_url} alt={currentUser.name} />
                {/* <span>{currentUser.name}</span> */}
              </span>
            }>
            <Menu.Item key="profile">
              <a href="users/me">Profile</a>
            </Menu.Item>
            {currentUser.hasPermission("super_admin") && (
              <Menu.Item key="status">
                <a href="admin/status">System Status</a>
              </Menu.Item>
            )}
            <Menu.Divider />

            <Menu.Item key="logout">
              <a onClick={() => Auth.logout()}>Log out</a>
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
        <Button onClick={() => setCollapsed(!collapsed)} className="collapse-button">
          <Icon type={collapsed ? "menu-unfold" : "menu-fold"} />
        </Button>
      </div>
      <div className="application-layout-content">
        <ApplicationHeader />
        {children}
      </div>
    </React.Fragment>
  );
}

ApplicationLayout.propTypes = {
  children: PropTypes.node,
};

ApplicationLayout.defaultProps = {
  children: null,
};
