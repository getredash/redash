import React from "react";
import Checkbox from "antd/lib/checkbox";
import Form from "antd/lib/form";
import InputNumber from "antd/lib/input-number";
import Row from "antd/lib/row";
import Skeleton from "antd/lib/skeleton";
import DynamicComponent from "@/components/DynamicComponent";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "../prop-types";

export default function FeatureFlagsSettings(props) {
  const { values, onChange, loading } = props;

  return (
    <DynamicComponent name="OrganizationSettings.FeatureFlagsSettings" {...props}>
      <Form.Item label="Feature Flags">
        {loading ? (
          <>
            <Row>
              <Skeleton title={false} paragraph={{ width: [300, 300, 300], rows: 3 }} active />
            </Row>
          </>
        ) : (
          <>
            <DynamicComponent name="OrganizationSettings.FeatureFlagsSettings.PermissionsControl" {...props}>
              <Row>
                <Checkbox
                  name="feature_show_permissions_control"
                  checked={values.feature_show_permissions_control}
                  onChange={e => onChange({ feature_show_permissions_control: e.target.checked })}>
                  Enable experimental multiple owners support
                </Checkbox>
              </Row>
            </DynamicComponent>
            <Row>
              <Checkbox
                name="send_email_on_failed_scheduled_queries"
                checked={values.send_email_on_failed_scheduled_queries}
                onChange={e => onChange({ send_email_on_failed_scheduled_queries: e.target.checked })}>
                Email query owners when scheduled queries fail
              </Checkbox>
            </Row>
            <Row>
              <Checkbox
                name="multi_byte_search_enabled"
                checked={values.multi_byte_search_enabled}
                onChange={e => onChange({ multi_byte_search_enabled: e.target.checked })}>
                Enable multi-byte (Chinese, Japanese, and Korean) search for query names and descriptions (slower)
              </Checkbox>
            </Row>
          </>
        )}
      </Form.Item>
      <Form.Item label="Non-Admin Refresh Cooldown (seconds)">
        {loading ? (
          <Skeleton.Input active size="small" />
        ) : (
          <>
            <InputNumber
              min={0}
              value={values.non_admin_refresh_cooldown}
              onChange={value => onChange({ non_admin_refresh_cooldown: value })}
            />
            <div className="m-t-5" style={{ color: "#888" }}>
              Non-admin users cannot refresh queries or dashboards more frequently than this interval. Set to 0 to disable.
            </div>
          </>
        )}
      </Form.Item>
    </DynamicComponent>
  );
}

FeatureFlagsSettings.propTypes = SettingsEditorPropTypes;

FeatureFlagsSettings.defaultProps = SettingsEditorDefaultProps;
