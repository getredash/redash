import { first } from "lodash";
import React from "react";
import Button from "antd/lib/button";
import MenuOutlinedIcon from "@ant-design/icons/MenuOutlined";
import Dropdown from "antd/lib/dropdown";
import Menu from "antd/lib/menu";
import Link from "@/components/Link";
import { Auth, currentUser } from "@/services/auth";
import settingsMenu from "@/services/settingsMenu";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '@/assets/images/redash_icon_sm... Remove this comment to see the full error message
import logoUrl from "@/assets/images/redash_icon_small.png";
import "./MobileNavbar.less";
type OwnProps = {
    getPopupContainer?: (...args: any[]) => any;
};
type Props = OwnProps & typeof MobileNavbar.defaultProps;
export default function MobileNavbar({ getPopupContainer }: Props) {
    const firstSettingsTab = first(settingsMenu.getAvailableItems());
    return (<div className="mobile-navbar">
      <div className="mobile-navbar-logo">
        <Link href="./">
          <img src={logoUrl} alt="Redash"/>
        </Link>
      </div>
      <div>
        <Dropdown overlayStyle={{ minWidth: 200 }} trigger={["click"]} getPopupContainer={getPopupContainer} // so the overlay menu stays with the fixed header when page scrolls
     overlay={<Menu mode="vertical" theme="dark" selectable={false} className="mobile-navbar-menu">
              {currentUser.hasPermission("list_dashboards") && (<Menu.Item key="dashboards">
                  <Link href="dashboards">Dashboards</Link>
                </Menu.Item>)}
              {currentUser.hasPermission("view_query") && (<Menu.Item key="queries">
                  <Link href="queries">Queries</Link>
                </Menu.Item>)}
              {currentUser.hasPermission("list_alerts") && (<Menu.Item key="alerts">
                  <Link href="alerts">Alerts</Link>
                </Menu.Item>)}
              <Menu.Item key="profile">
                <Link href="users/me">Edit Profile</Link>
              </Menu.Item>
              <Menu.Divider />
              {firstSettingsTab && (<Menu.Item key="settings">
                  <Link href={(firstSettingsTab as any).path}>Settings</Link>
                </Menu.Item>)}
              {currentUser.hasPermission("super_admin") && (<Menu.Item key="status">
                  <Link href="admin/status">System Status</Link>
                </Menu.Item>)}
              {currentUser.hasPermission("super_admin") && <Menu.Divider />}
              <Menu.Item key="help">
                
                <Link href="https://redash.io/help" target="_blank" rel="noopener">
                  Help
                </Link>
              </Menu.Item>
              <Menu.Item key="logout" onClick={() => Auth.logout()}>
                Log out
              </Menu.Item>
            </Menu>}>
          <Button className="mobile-navbar-toggle-button" ghost>
            <MenuOutlinedIcon />
          </Button>
        </Dropdown>
      </div>
    </div>);
}
MobileNavbar.defaultProps = {
    getPopupContainer: null,
};
