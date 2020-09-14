import React from "react";
import Form from "antd/lib/form";
import Checkbox from "antd/lib/checkbox";
import Input from "antd/lib/input";
import Radio from "antd/lib/radio";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function SAMLSettings(props) {
  const { values, onChange } = props;

  return (
    <DynamicComponent name="OrganizationSettings.SAMLSettings" {...props}>
      <h4>SAML</h4>
      <Form.Item label="SAML Enabled">
        <Checkbox
          name="auth_saml_enabled"
          checked={values.auth_saml_enabled}
          onChange={e => onChange({ auth_saml_enabled: e.target.checked })}>
          SAML Enabled
        </Checkbox>
      </Form.Item>
      {values.auth_saml_enabled && (
        <div>
          <Radio.Group
            onChange={e => onChange({ auth_saml_type: e.target.value })}
            value={values.auth_saml_type}
            defaultValue="static">
            <Radio value={"static"}>Static</Radio>
            <Radio value={"dynamic"}>Dynamic</Radio>
          </Radio.Group>
          {values.auth_saml_type === "static" && (
            <div>
              <Form.Item label="SAML Single Sign-on URL">
                <Input
                  value={values.auth_saml_sso_url}
                  onChange={e => onChange({ auth_saml_sso_url: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="SAML Entity ID">
                <Input
                  value={values.auth_saml_entity_id}
                  onChange={e => onChange({ auth_saml_entity_id: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="SAML x509 cert">
                <Input
                  value={values.auth_saml_x509_cert}
                  onChange={e => onChange({ auth_saml_x509_cert: e.target.value })}
                />
              </Form.Item>
            </div>
          )}
          {values.auth_saml_type === "dynamic" && (
            <div>
              <Form.Item label="SAML Metadata URL">
                <Input
                  value={values.auth_saml_metadata_url}
                  onChange={e => onChange({ auth_saml_metadata_url: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="SAML Entity ID">
                <Input
                  value={values.auth_saml_entity_id}
                  onChange={e => onChange({ auth_saml_entity_id: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="SAML NameID Format">
                <Input
                  value={values.auth_saml_nameid_format}
                  onChange={e => onChange({ auth_saml_nameid_format: e.target.value })}
                />
              </Form.Item>
            </div>
          )}
        </div>
      )}
    </DynamicComponent>
  );
}

SAMLSettings.propTypes = SettingsEditorPropTypes;

SAMLSettings.defaultProps = SettingsEditorDefaultProps;
