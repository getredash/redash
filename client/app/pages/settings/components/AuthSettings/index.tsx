import React, { useCallback } from "react";
import HelpTrigger from "@/components/HelpTrigger";
import DynamicComponent from "@/components/DynamicComponent";
import { clientConfig } from "@/services/auth";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

import PasswordLoginSettings from "./PasswordLoginSettings";
import GoogleLoginSettings from "./GoogleLoginSettings";
import SAMLSettings from "./SAMLSettings";

export default function AuthSettings(props) {
  const { values, onChange } = props;
  const handleChange = useCallback(
    changes => {
      const allSettings = { ...values, ...changes };
      const allAuthMethodsDisabled =
        !clientConfig.googleLoginEnabled && !clientConfig.ldapLoginEnabled && !allSettings.auth_saml_enabled;
      if (allAuthMethodsDisabled) {
        changes = { ...changes, auth_password_login_enabled: true };
      }
      onChange(changes);
    },
    [values, onChange]
  );

  return (
    <DynamicComponent name="OrganizationSettings.AuthSettings" {...props}>
      <h3 className="m-t-0">
        Authentication <HelpTrigger type="AUTHENTICATION_OPTIONS" />
      </h3>
      <hr />
      <PasswordLoginSettings {...props} onChange={handleChange} />
      <GoogleLoginSettings {...props} onChange={handleChange} />
      <SAMLSettings {...props} onChange={handleChange} />
    </DynamicComponent>
  );
}

AuthSettings.propTypes = SettingsEditorPropTypes;
AuthSettings.defaultProps = SettingsEditorDefaultProps;
