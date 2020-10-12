import { get } from "lodash";
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import Form from "antd/lib/form";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import LoadingState from "@/components/items-list/components/LoadingState";
import wrapSettingsTab from "@/components/SettingsWrapper";

import recordEvent from "@/services/recordEvent";
import OrgSettings from "@/services/organizationSettings";
import routes from "@/services/routes";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import { getHorizontalFormProps, getHorizontalFormItemWithoutLabelProps } from "@/styles/formStyle";

import GeneralSettings from "./components/GeneralSettings";
import AuthSettings from "./components/AuthSettings";

function OrganizationSettings({ onError }) {
  const [settings, setSettings] = useState({});
  const [currentValues, setCurrentValues] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleError = useImmutableCallback(onError);

  useEffect(() => {
    recordEvent("view", "page", "org_settings");

    let isCancelled = false;

    OrgSettings.get()
      .then(response => {
        if (!isCancelled) {
          const settings = get(response, "settings");
          setSettings(settings);
          setCurrentValues({ ...settings });
          setIsLoading(false);
        }
      })
      .catch(error => {
        if (!isCancelled) {
          handleError(error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [handleError]);

  const handleChange = useCallback(changes => {
    setCurrentValues(currentValues => ({ ...currentValues, ...changes }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!isSaving) {
      setIsSaving(true);
      OrgSettings.save(currentValues)
        .then(response => {
          const settings = get(response, "settings");
          setSettings(settings);
          setCurrentValues({ ...settings });
        })
        .catch(handleError)
        .finally(() => setIsSaving(false));
    }
  }, [isSaving, currentValues, handleError]);

  return (
    <div className="row" data-test="OrganizationSettings">
      <div className="m-r-20 m-l-20">
        {isLoading ? (
          <LoadingState className="" />
        ) : (
          <Form {...getHorizontalFormProps()} onFinish={handleSubmit}>
            <GeneralSettings settings={settings} values={currentValues} onChange={handleChange} />
            <AuthSettings settings={settings} values={currentValues} onChange={handleChange} />
            <Form.Item {...getHorizontalFormItemWithoutLabelProps()}>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Save
              </Button>
            </Form.Item>
          </Form>
        )}
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
