import { first } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import MenuOutlinedIcon from "@ant-design/icons/MenuOutlined";
import Dropdown from "antd/lib/dropdown";
import Link from "@/components/Link";
import { Auth, currentUser } from "@/services/auth";
import settingsMenu from "@/services/settingsMenu";
import logoUrl from "@/assets/images/redash_icon_small.png";

import "./MobileNavbar.less";

export default function MobileNavbar({ getPopupContainer = null }) {
  const firstSettingsTab = first(settingsMenu.getAvailableItems());
  const menuItems = [
    currentUser.hasPermission("list_dashboards") && {
      key: "dashboards",
      label: <Link href="dashboards">Dashboards</Link>,
    },
    currentUser.hasPermission("view_query") && {
      key: "queries",
      label: <Link href="queries">Queries</Link>,
    },
    currentUser.hasPermission("list_alerts") && {
      key: "alerts",
      label: <Link href="alerts">Alerts</Link>,
    },
    {
      key: "profile",
      label: <Link href="users/me">Edit Profile</Link>,
    },
    { type: "divider" },
    firstSettingsTab && {
      key: "settings",
      label: <Link href={firstSettingsTab.path}>Settings</Link>,
    },
    currentUser.hasPermission("super_admin") && {
      key: "status",
      label: <Link href="admin/status">System Status</Link>,
    },
    currentUser.hasPermission("super_admin") && { type: "divider" },
    {
      key: "help",
      label: (
        // eslint-disable-next-line react/jsx-no-target-blank
        <Link href="https://redash.io/help" target="_blank" rel="noopener">
          Help
        </Link>
      ),
    },
    {
      key: "logout",
      label: "Log out",
      onClick: () => Auth.logout(),
    },
  ].filter(Boolean);

  return (
    <div className="mobile-navbar">
      <div className="mobile-navbar-logo">
        <Link href="./">
          <img src={logoUrl} alt="Redash" />
        </Link>
      </div>
      <div>
        <Dropdown
          styles={{ root: { minWidth: 200 } }}
          trigger={["click"]}
          getPopupContainer={getPopupContainer} // so the overlay menu stays with the fixed header when page scrolls
          menu={{
            items: menuItems,
            mode: "vertical",
            theme: "dark",
            selectable: false,
            className: "mobile-navbar-menu",
          }}
        >
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
