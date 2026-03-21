import React, { useMemo } from "react";
import { first, includes } from "lodash";
import Menu from "antd/lib/menu";
import Link from "@/components/Link";
import PlainButton from "@/components/PlainButton";
import HelpTrigger from "@/components/HelpTrigger";
import CreateDashboardDialog from "@/components/dashboards/CreateDashboardDialog";
import { useCurrentRoute } from "@/components/ApplicationArea/Router";
import { Auth, currentUser } from "@/services/auth";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

import DesktopOutlinedIcon from "@ant-design/icons/DesktopOutlined";
import CodeOutlinedIcon from "@ant-design/icons/CodeOutlined";
import AlertOutlinedIcon from "@ant-design/icons/AlertOutlined";
import PlusOutlinedIcon from "@ant-design/icons/PlusOutlined";
import QuestionCircleOutlinedIcon from "@ant-design/icons/QuestionCircleOutlined";
import SettingOutlinedIcon from "@ant-design/icons/SettingOutlined";
import VersionInfo from "./VersionInfo";

import "./DesktopNavbar.less";

function NavbarSection({ items = [], ...props }) {
  return <Menu selectable={false} mode="vertical" theme="dark" items={items} {...props} />;
}

function useNavbarActiveState() {
  const currentRoute = useCurrentRoute();

  return useMemo(
    () => ({
      dashboards: includes(
        [
          "Dashboards.List",
          "Dashboards.Favorites",
          "Dashboards.My",
          "Dashboards.ViewOrEdit",
          "Dashboards.LegacyViewOrEdit",
        ],
        currentRoute.id
      ),
      queries: includes(
        [
          "Queries.List",
          "Queries.Favorites",
          "Queries.Archived",
          "Queries.My",
          "Queries.View",
          "Queries.New",
          "Queries.Edit",
        ],
        currentRoute.id
      ),
      dataSources: includes(["DataSources.List"], currentRoute.id),
      alerts: includes(["Alerts.List", "Alerts.New", "Alerts.View", "Alerts.Edit"], currentRoute.id),
    }),
    [currentRoute.id]
  );
}

export default function DesktopNavbar() {
  const firstSettingsTab = first(settingsMenu.getAvailableItems());

  const activeState = useNavbarActiveState();

  const canCreateQuery = currentUser.hasPermission("create_query");
  const canCreateDashboard = currentUser.hasPermission("create_dashboard");
  const canCreateAlert = currentUser.hasPermission("list_alerts");
  const logoItems = [
    {
      key: "home",
      label: (
        <Link href="./">
          <img src={logoUrl} alt="Redash" />
        </Link>
      ),
    },
  ];
  const navigationItems = [
    currentUser.hasPermission("list_dashboards") && {
      key: "dashboards",
      className: activeState.dashboards ? "navbar-active-item" : null,
      label: (
        <Link href="dashboards">
          <DesktopOutlinedIcon aria-label="Dashboard navigation button" />
          <span className="desktop-navbar-label">Dashboards</span>
        </Link>
      ),
    },
    currentUser.hasPermission("view_query") && {
      key: "queries",
      className: activeState.queries ? "navbar-active-item" : null,
      label: (
        <Link href="queries">
          <CodeOutlinedIcon aria-label="Queries navigation button" />
          <span className="desktop-navbar-label">Queries</span>
        </Link>
      ),
    },
    currentUser.hasPermission("list_alerts") && {
      key: "alerts",
      className: activeState.alerts ? "navbar-active-item" : null,
      label: (
        <Link href="alerts">
          <AlertOutlinedIcon aria-label="Alerts navigation button" />
          <span className="desktop-navbar-label">Alerts</span>
        </Link>
      ),
    },
  ].filter(Boolean);
  const createItems =
    canCreateQuery || canCreateDashboard || canCreateAlert
      ? [
          {
            key: "create",
            popupClassName: "desktop-navbar-submenu",
            icon: <PlusOutlinedIcon />,
            label: (
              <span data-test="CreateButton">
                <span className="desktop-navbar-label">Create</span>
              </span>
            ),
            children: [
              canCreateQuery && {
                key: "new-query",
                label: (
                  <Link href="queries/new" data-test="CreateQueryMenuItem">
                    New Query
                  </Link>
                ),
              },
              canCreateDashboard && {
                key: "new-dashboard",
                label: (
                  <PlainButton data-test="CreateDashboardMenuItem" onClick={() => CreateDashboardDialog.showModal()}>
                    New Dashboard
                  </PlainButton>
                ),
              },
              canCreateAlert && {
                key: "new-alert",
                label: (
                  <Link data-test="CreateAlertMenuItem" href="alerts/new">
                    New Alert
                  </Link>
                ),
              },
            ].filter(Boolean),
          },
        ]
      : [];
  const utilityItems = [
    {
      key: "help",
      label: (
        <HelpTrigger showTooltip={false} type="HOME" tabIndex={0}>
          <QuestionCircleOutlinedIcon />
          <span className="desktop-navbar-label">Help</span>
        </HelpTrigger>
      ),
    },
    firstSettingsTab && {
      key: "settings",
      className: activeState.dataSources ? "navbar-active-item" : null,
      label: (
        <Link href={firstSettingsTab.path} data-test="SettingsLink">
          <SettingOutlinedIcon />
          <span className="desktop-navbar-label">Settings</span>
        </Link>
      ),
    },
  ].filter(Boolean);
  const profileItems = [
    {
      key: "profile-menu",
      popupClassName: "desktop-navbar-submenu",
      label: (
        <span data-test="ProfileDropdown" className="desktop-navbar-profile-menu-title">
          <img className="profile__image_thumb" src={currentUser.profile_image_url} alt={currentUser.name} />
        </span>
      ),
      children: [
        {
          key: "profile",
          label: <Link href="users/me">Profile</Link>,
        },
        currentUser.hasPermission("super_admin") && {
          key: "status",
          label: <Link href="admin/status">System Status</Link>,
        },
        { type: "divider" },
        {
          key: "logout",
          label: (
            <PlainButton data-test="LogOutButton" onClick={() => Auth.logout()}>
              Log out
            </PlainButton>
          ),
        },
        { type: "divider" },
        {
          key: "version",
          disabled: true,
          className: "version-info",
          label: <VersionInfo />,
        },
      ].filter(Boolean),
    },
  ];

  return (
    <nav className="desktop-navbar">
      <NavbarSection className="desktop-navbar-logo" items={logoItems} />
      <NavbarSection items={navigationItems} />
      <NavbarSection className="desktop-navbar-spacer" items={createItems} />
      <NavbarSection items={utilityItems} />
      <NavbarSection className="desktop-navbar-profile-menu" items={profileItems} />
    </nav>
  );
}
