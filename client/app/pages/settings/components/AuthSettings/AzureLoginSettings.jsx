import { isEmpty, join } from "lodash";
import React from "react";
import Form from "antd/lib/form";
import Select from "antd/lib/select";
import Alert from "antd/lib/alert";
import DynamicComponent from "@/components/DynamicComponent";
import { clientConfig } from "@/services/auth";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function AzureLoginSettings(props) {
  const { values, onChange } = props;

  if (!clientConfig.azureLoginEnabled) {
    return null;
  }

  return (
    <DynamicComponent name="OrganizationSettings.AzureLoginSettings" {...props}>
      <h4>Microsoft Work or School Account Login</h4>
      <Form.Item label="Allowed User Domains">
        <Select
          mode="tags"
          value={values.auth_azure_apps_domains}
          onChange={value => onChange({ auth_azure_apps_domains: value })}
        />
        {!isEmpty(values.auth_azure_apps_domains) && (
          <Alert
            message={
              <p>
                Any user registered with a <strong>{join(values.auth_azure_apps_domains, ", ")}</strong> work or school
                account will be able to login. If they don't have an existing user, a new user will be created and join
                the <strong>Default</strong> group.
              </p>
            }
            className="m-t-15"
          />
        )}
      </Form.Item>
      <Form.Item label="Allowed Roles (case sensitive)">
        <Select
          mode="tags"
          value={values.auth_azure_roles}
          onChange={value => onChange({ auth_azure_roles: value })}
        />
        {!isEmpty(values.auth_azure_roles) && (
          <Alert
            message={
              <p>
                Restrict access to users assigned the <strong>{join(values.auth_azure_roles, ", ")}</strong> role.
              </p>
            }
            className="m-t-16"
          />
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

AzureLoginSettings.propTypes = SettingsEditorPropTypes;

AzureLoginSettings.defaultProps = SettingsEditorDefaultProps;
