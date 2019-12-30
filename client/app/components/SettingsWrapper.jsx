import React from "react";
import Menu from "antd/lib/menu";
import PageHeader from "@/components/PageHeader";
import { $location } from "@/services/ng";
import settingsMenu from "@/services/settingsMenu";

function wrapSettingsTab(options, WrappedComponent) {
  if (options) {
    settingsMenu.add(options);
  }

  return function SettingsTab(props) {
    const activeItem = settingsMenu.getActiveItem($location.path());
    return (
      <div className="settings-screen">
        <div className="container">
          <PageHeader title="Settings" />
          <div className="bg-white tiled">
            <Menu selectedKeys={[activeItem && activeItem.title]} selectable={false} mode="horizontal">
              {settingsMenu.items.map(item => (
                <Menu.Item key={item.title}>
                  <a href={item.path}>{item.title}</a>
                </Menu.Item>
              ))}
            </Menu>
            <div className="p-15">
              <div>
                <WrappedComponent {...props} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

export default wrapSettingsTab;
