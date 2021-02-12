import React from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import Form from "antd/lib/form";
import Skeleton from "antd/lib/skeleton";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import wrapSettingsTab from "@/components/SettingsWrapper";

import routes from "@/services/routes";
import { getHorizontalFormProps, getHorizontalFormItemWithoutLabelProps } from "@/styles/formStyle";

import useOrganizationSettings from "./hooks/useOrganizationSettings";
import GeneralSettings from "./components/GeneralSettings";
import AuthSettings from "./components/AuthSettings";

function OrganizationSettings({ onError }) {
  const { settings, currentValues, isLoading, isSaving, handleSubmit, handleChange } = useOrganizationSettings(onError);
  return (
    <div className="row" data-test="OrganizationSettings">
      <div className="m-r-20 m-l-20">
        <Form {...getHorizontalFormProps()} onFinish={handleSubmit}>
          <GeneralSettings loading={isLoading} settings={settings} values={currentValues} onChange={handleChange} />
          <AuthSettings loading={isLoading} settings={settings} values={currentValues} onChange={handleChange} />
          <Form.Item {...getHorizontalFormItemWithoutLabelProps()}>
            {isLoading ? (
              <Skeleton.Button active />
            ) : (
              <Button type="primary" htmlType="submit" loading={isSaving} data-test="OrganizationSettingsSaveButton">
                Save
              </Button>
            )}
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

OrganizationSettings.propTypes = {
  onError: PropTypes.func,
};

OrganizationSettings.defaultProps = {
  onError: () => {},
};

const OrganizationSettingsPage = wrapSettingsTab(
  "Settings.Organization",
  {
    permission: "admin",
    title: "General",
    path: "settings/general",
    order: 6,
  },
  OrganizationSettings
);

routes.register(
  "Settings.Organization",
  routeWithUserSession({
    path: "/settings/general",
    title: "General Settings",
    render: pageProps => <OrganizationSettingsPage {...pageProps} />,
  })
);
