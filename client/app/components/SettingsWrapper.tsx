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
    return (
      <div className="settings-screen">
        <div className="container">
          <PageHeader title="Settings" />
          <div className="bg-white tiled">
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'title' does not exist on type 'number | ... Remove this comment to see the full error message */}
            <Menu selectedKeys={[activeItem && activeItem.title]} selectable={false} mode="horizontal">
              {settingsMenu.getAvailableItems().map(item => (
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'title' does not exist on type 'number | ... Remove this comment to see the full error message
                <Menu.Item key={item.title}>
                  {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'path' does not exist on type 'number | (... Remove this comment to see the full error message */}
                  <Link href={item.path} data-test="SettingsScreenItem">
                    {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'title' does not exist on type 'number | ... Remove this comment to see the full error message */}
                    {item.title}
                  </Link>
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
