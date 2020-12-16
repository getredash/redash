import { first } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import MenuOutlinedIcon from "@ant-design/icons/MenuOutlined";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Link from "@/components/Link";
import { Auth, currentUser } from "@/services/auth";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

import "./MobileNavbar.less";

export default function MobileNavbar({ getPopupContainer }) {
  const firstSettingsTab = first(settingsMenu.getAvailableItems());

  return (
    <div className="mobile-navbar">
      <div className="mobile-navbar-logo">
        <Link href="./">
          <img src={logoUrl} alt="Redash" />
        </Link>
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
                  <Link href="dashboards">Dashboards</Link>
                </Menu.Item>
              )}
              {currentUser.hasPermission("view_query") && (
                <Menu.Item key="queries">
                  <Link href="queries">Queries</Link>
                </Menu.Item>
              )}
              {currentUser.hasPermission("list_alerts") && (
                <Menu.Item key="alerts">
                  <Link href="alerts">Alerts</Link>
                </Menu.Item>
              )}
              <Menu.Item key="profile">
                <Link href="users/me">Edit Profile</Link>
              </Menu.Item>
              <Menu.Divider />
              {firstSettingsTab && (
                <Menu.Item key="settings">
                  <Link href={firstSettingsTab.path}>Settings</Link>
                </Menu.Item>
              )}
              {currentUser.hasPermission("super_admin") && (
                <Menu.Item key="status">
                  <Link href="admin/status">System Status</Link>
                </Menu.Item>
              )}
              {currentUser.hasPermission("super_admin") && <Menu.Divider />}
              <Menu.Item key="help">
                {/* eslint-disable-next-line react/jsx-no-target-blank */}
                <Link href="https://redash.io/help" target="_blank" rel="noopener">
                  Help
                </Link>
              </Menu.Item>
              <Menu.Item key="logout" onClick={() => Auth.logout()}>
                Log out
              </Menu.Item>
            </Menu>
          }>
          <Button className="mobile-navbar-toggle-button" ghost>
            <MenuOutlinedIcon />
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
