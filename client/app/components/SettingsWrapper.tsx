import React from "react";
import Menu from "antd/lib/menu";
import PageHeader from "@/components/PageHeader";
import Link from "@/components/Link";
import location from "@/services/location";
import settingsMenu from "@/services/settingsMenu";
function wrapSettingsTab(id: any, options: any, WrappedComponent: any) {
    settingsMenu.add(id, options);
    return function SettingsTab(props: any) {
        const activeItem = settingsMenu.getActiveItem(location.path);
        return (<div className="settings-screen">
        <div className="container">
          <PageHeader title="Settings"/>
          <div className="bg-white tiled">
            <Menu selectedKeys={[activeItem && (activeItem as any).title]} selectable={false} mode="horizontal">
              {settingsMenu.getAvailableItems().map(item => (<Menu.Item key={(item as any).title}>
                  <Link href={(item as any).path} data-test="SettingsScreenItem">
                    {(item as any).title}
                  </Link>
                </Menu.Item>))}
            </Menu>
            <div className="p-15">
              <div>
                <WrappedComponent {...props}/>
              </div>
            </div>
          </div>
        </div>
      </div>);
    };
}
export default wrapSettingsTab;
