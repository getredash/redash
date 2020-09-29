import { first } from "lodash";
import React, { useState } from "react";
import Button from "antd/lib/button";
import Menu from "antd/lib/menu";
import Link from "@/components/Link";
import HelpTrigger from "@/components/HelpTrigger";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import { Auth, currentUser } from "@/services/auth";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

import DesktopOutlinedIcon from "@ant-design/icons/DesktopOutlined";
import CodeOutlinedIcon from "@ant-design/icons/CodeOutlined";
import AlertOutlinedIcon from "@ant-design/icons/AlertOutlined";
import PlusOutlinedIcon from "@ant-design/icons/PlusOutlined";
import QuestionCircleOutlinedIcon from "@ant-design/icons/QuestionCircleOutlined";
import SettingOutlinedIcon from "@ant-design/icons/SettingOutlined";
import MenuUnfoldOutlinedIcon from "@ant-design/icons/MenuUnfoldOutlined";
import MenuFoldOutlinedIcon from "@ant-design/icons/MenuFoldOutlined";

import VersionInfo from "./VersionInfo";
import "./DesktopNavbar.less";

function NavbarSection({ inlineCollapsed, children, ...props }) {
  return (
    <Menu
      selectable={false}
      mode={inlineCollapsed ? "inline" : "vertical"}
      inlineCollapsed={inlineCollapsed}
      theme="dark"
      {...props}>
      {children}
    </Menu>
  );
}

export default function DesktopNavbar() {
  const [collapsed, setCollapsed] = useState(true);

  const firstSettingsTab = first(settingsMenu.getAvailableItems());

  const canCreateQuery = currentUser.hasPermission("create_query");
  const canCreateDashboard = currentUser.hasPermission("create_dashboard");
  const canCreateAlert = currentUser.hasPermission("list_alerts");

  return (
    <div className="desktop-navbar">
      <NavbarSection inlineCollapsed={collapsed} className="desktop-navbar-logo">
        <div>
          <Link href="./">
            <img src={logoUrl} alt="Redash" />
          </Link>
        </div>
      </NavbarSection>

      <NavbarSection inlineCollapsed={collapsed}>
        {currentUser.hasPermission("list_dashboards") && (
          <Menu.Item key="dashboards">
            <Link href="dashboards">
              <DesktopOutlinedIcon />
              <span>Dashboards</span>
            </Link>
          </Menu.Item>
        )}
        {currentUser.hasPermission("view_query") && (
          <Menu.Item key="queries">
            <Link href="queries">
              <CodeOutlinedIcon />
              <span>Queries</span>
            </Link>
          </Menu.Item>
        )}
        {currentUser.hasPermission("list_alerts") && (
          <Menu.Item key="alerts">
            <Link href="alerts">
              <AlertOutlinedIcon />
              <span>Alerts</span>
            </Link>
          </Menu.Item>
        )}
      </NavbarSection>

      <NavbarSection inlineCollapsed={collapsed} className="desktop-navbar-spacer">
        {(canCreateQuery || canCreateDashboard || canCreateAlert) && <Menu.Divider />}
        {(canCreateQuery || canCreateDashboard || canCreateAlert) && (
          <Menu.SubMenu
            key="create"
            popupClassName="desktop-navbar-submenu"
            title={
              <React.Fragment>
                <span data-test="CreateButton">
                  <PlusOutlinedIcon />
                  <span>Create</span>
                </span>
              </React.Fragment>
            }>
            {canCreateQuery && (
              <Menu.Item key="new-query">
                <Link href="queries/new" data-test="CreateQueryMenuItem">
                  New Query
                </Link>
              </Menu.Item>
            )}
            {canCreateDashboard && (
              <Menu.Item key="new-dashboard">
                <a data-test="CreateDashboardMenuItem" onMouseUp={() => CreateDashboardDialog.showModal()}>
                  New Dashboard
                </a>
              </Menu.Item>
            )}
            {canCreateAlert && (
              <Menu.Item key="new-alert">
                <Link data-test="CreateAlertMenuItem" href="alerts/new">
                  New Alert
                </Link>
              </Menu.Item>
            )}
          </Menu.SubMenu>
        )}
      </NavbarSection>

      <NavbarSection inlineCollapsed={collapsed}>
        <Menu.Item key="help">
          <HelpTrigger showTooltip={false} type="HOME">
            <QuestionCircleOutlinedIcon />
            <span>Help</span>
          </HelpTrigger>
        </Menu.Item>
        {firstSettingsTab && (
          <Menu.Item key="settings">
            <Link href={firstSettingsTab.path} data-test="SettingsLink">
              <SettingOutlinedIcon />
              <span>Settings</span>
            </Link>
          </Menu.Item>
        )}
        <Menu.Divider />
      </NavbarSection>

      <NavbarSection inlineCollapsed={collapsed} className="desktop-navbar-profile-menu">
        <Menu.SubMenu
          key="profile"
          popupClassName="desktop-navbar-submenu"
          title={
            <span data-test="ProfileDropdown" className="desktop-navbar-profile-menu-title">
              <img className="profile__image_thumb" src={currentUser.profile_image_url} alt={currentUser.name} />
              <span>{currentUser.name}</span>
            </span>
          }>
          <Menu.Item key="profile">
            <Link href="users/me">Profile</Link>
          </Menu.Item>
          {currentUser.hasPermission("super_admin") && (
            <Menu.Item key="status">
              <Link href="admin/status">System Status</Link>
            </Menu.Item>
          )}
          <Menu.Divider />
          <Menu.Item key="logout">
            <a data-test="LogOutButton" onClick={() => Auth.logout()}>
              Log out
            </a>
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item key="version" disabled className="version-info">
            <VersionInfo />
          </Menu.Item>
        </Menu.SubMenu>
      </NavbarSection>

      <Button onClick={() => setCollapsed(!collapsed)} className="desktop-navbar-collapse-button">
        {collapsed ? <MenuUnfoldOutlinedIcon /> : <MenuFoldOutlinedIcon />}
      </Button>
    </div>
  );
}
