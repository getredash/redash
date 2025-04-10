import { isEmpty, join } from "lodash";
import React from "react";
import Form from "antd/lib/form";
import Select from "antd/lib/select";
import Alert from "antd/lib/alert";
import DynamicComponent from "@/components/DynamicComponent";
import { clientConfig } from "@/services/auth";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function OIDCLoginSettings(props) {
  const { values, onChange } = props;

  if (!clientConfig.oidcLoginEnabled) {
    return null;
  }

  return (
    <DynamicComponent name="OrganizationSettings.OIDCLoginSettings" {...props}>
      <h4>OIDC Login</h4>
      <Form.Item label="Allowed Domains">
        <Select
          mode="tags"
          value={values.auth_oidc_domains}
          onChange={value => onChange({ auth_oidc_domains: value })}
        />
        {!isEmpty(values.auth_oidc_domains) && (
          <Alert
            message={
              <p>
                Any user registered with a <strong>{join(values.auth_oidc_domains, ", ")} </strong>
                 <span> </span>domain will be able to login. If they don't have an existing user, a new user will be created and join
                the <strong>Default</strong> group.
              </p>
            }
            className="m-t-15"
          />
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

OIDCLoginSettings.propTypes = SettingsEditorPropTypes;

OIDCLoginSettings.defaultProps = SettingsEditorDefaultProps;
