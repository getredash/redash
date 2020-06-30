import { first } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Icon from "antd/lib/icon";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import { Auth, currentUser } from "@/services/auth";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

import "./MobileNavbar.less";

export default function MobileNavbar({ getPopupContainer }) {
  const firstSettingsTab = first(settingsMenu.getAvailableItems());

  return (
    <div className="mobile-navbar">
      <div className="mobile-navbar-logo">
        <a href="./">
          <img src={logoUrl} alt="Redash" />
        </a>
      </div>
      <div>
        <Dropdown
          overlayStyle={{ minWidth: 200 }}
          trigger={["click"]}
          getPopupContainer={getPopupContainer} // so the overlay menu stays with the fixed header when page scrolls
          overlay={
            <Menu mode="vertical" theme="dark" selectable={false} className="mobile-navbar-menu">
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
              {firstSettingsTab && (
                <Menu.Item key="settings">
                  <a href={firstSettingsTab.path}>Settings</a>
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
          <Button className="mobile-navbar-toggle-button" ghost>
            <Icon type="menu" />
          </Button>
        </Dropdown>
      </div>
    </div>
  );
}

MobileNavbar.propTypes = {
  getPopupContainer: PropTypes.func,
};

MobileNavbar.defaultProps = {
  getPopupContainer: null,
};
