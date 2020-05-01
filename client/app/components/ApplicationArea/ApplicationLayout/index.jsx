import React from "react";
import PropTypes from "prop-types";
import Menu from "antd/lib/menu";
import HelpTrigger from "@/components/HelpTrigger";
import { Auth, currentUser } from "@/services/auth";
import logoUrl from "@/assets/images/redash_icon_small.png";

import ApplicationHeader from "../ApplicationHeader";

import "./index.less";

export default function ApplicationLayout({ children }) {
  return (
    <React.Fragment>
      <div className="application-layout-menu">
        <Menu mode="vertical" selectable={false}>
          <Menu.Item key="home" className="header-logo">
            <a href="./">
              <img src={logoUrl} alt="Redash" />
            </a>
          </Menu.Item>

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

          <Menu.Divider />

          <Menu.Item key="help">
            <HelpTrigger showTooltip={false} type="HOME">
              <i className="fa fa-question-circle" />
              <span>Help</span>
            </HelpTrigger>
          </Menu.Item>
          {currentUser.isAdmin && (
            <Menu.Item key="settings">
              <a href="data_sources">
                <i className="fa fa-sliders" />
                <span>Settings</span>
              </a>
            </Menu.Item>
          )}
          {currentUser.hasPermission("super_admin") && (
            <Menu.Item key="status">
              <a href="admin/status">System Status</a>
            </Menu.Item>
          )}

          <Menu.Divider />

          <Menu.Item key="profile">
            <a href="users/me">
              <img className="profile__image_thumb" src={currentUser.profile_image_url} alt={currentUser.name} />
              <span>{currentUser.name}</span>
            </a>
          </Menu.Item>
          <Menu.Item key="logout">
            <a onClick={() => Auth.logout()}>Log out</a>
          </Menu.Item>
        </Menu>
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
