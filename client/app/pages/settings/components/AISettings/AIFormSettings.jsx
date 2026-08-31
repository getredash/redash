import DynamicComponent from "@/components/DynamicComponent";
import Form from "antd/lib/form";
import Input from "antd/lib/input";
import Radio from "antd/lib/radio";
import Select from "antd/lib/select";
import Skeleton from "antd/lib/skeleton";
import React, { useEffect } from "react";
import { SettingsEditorDefaultProps, SettingsEditorPropTypes } from "../prop-types";

export default function AIFormSettings(props) {
  const { values, onChange, loading, modelsList, aiTypes, setModelsList } = props;

  useEffect(() => {
    // If the current model is not in the list of available models, select the first available model.
    if (Object.keys(modelsList).length > 0 && (!values.ai_model || !modelsList[values.ai_model])) {
      onChange({ ai_model: Object.keys(modelsList)[0] });
    }
  }, [values.ai_model, modelsList, onChange]);

  return (
    <DynamicComponent name="OrganizationSettings.AIFormSettings" {...props}>
      <Form.Item label="AI Enabled">
        {loading ? (
          <Skeleton title={{ width: 300 }} paragraph={false} active />
        ) : (
          <Radio.Group value={values.ai_enabled} onChange={(e) => onChange({ ai_enabled: e.target.value })}>
            <Radio value={false}>Disabled</Radio>
            <Radio value={true}>Enabled</Radio>
          </Radio.Group>
        )}
      </Form.Item>
      {values.ai_enabled && (
        <>
          <Form.Item label="AI Type">
            {loading ? (
              <Skeleton title={{ width: 300 }} paragraph={false} active />
            ) : (
              <Select
                value={values.ai_type || "huggingface-local"}
                onChange={(value) => onChange({ ai_type: value, ai_token: "", ai_host: "", ai_model: "" })}
              >
                {Object.entries(aiTypes).map(([key, model]) => (
                  <Select.Option key={key} value={key} disabled={!model.enabled}>
                    {model.name}
                  </Select.Option>
                ))}
              </Select>
            )}
          </Form.Item>
          <Form.Item label="API Key">
            {loading ? (
              <Skeleton title={{ width: 300 }} paragraph={false} active />
            ) : (
              <Input.Password
                value={values.ai_token || ""}
                onChange={(e) => onChange({ ai_token: e.target.value })}
                placeholder={"Xyz...qW1 " + (values.ai_type.endsWith("-cloud") ? "[Required]" : "(Optional)")}
                autoComplete="new-password"
                required={values.ai_type.endsWith("-cloud")}
              />
            )}
          </Form.Item>
          {values.ai_enabled && values.ai_type.endsWith("-remote") && (
            <Form.Item label="API Host">
              {loading ? (
                <Skeleton title={{ width: 300 }} paragraph={false} active />
              ) : (
                <Input
                  value={values.ai_host || ""}
                  onChange={(e) => {
                    setModelsList({});
                    return onChange({ ai_host: (e.target.value || "").replace(/\/+$/, ""), ai_model: "" });
                  }}
                  placeholder="https://api.example.com [Required]"
                  required={true}
                />
              )}
            </Form.Item>
          )}
          {values.ai_enabled && Object.keys(modelsList).length > 0 && (
            <Form.Item label="Model Name">
              {loading ? (
                <Skeleton title={{ width: 300 }} paragraph={false} active />
              ) : (
                <Select
                  value={values.ai_model || Object.keys(modelsList)[0]}
                  onChange={(value) => onChange({ ai_model: value })}
                >
                  {Object.entries(modelsList).map(([key, model]) => (
                    <Select.Option key={key} value={key} selected={values.ai_model === key}>
                      {model}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Form.Item>
          )}
        </>
      )}
    </DynamicComponent>
  );
}

AIFormSettings.propTypes = SettingsEditorPropTypes;

AIFormSettings.defaultProps = SettingsEditorDefaultProps;
