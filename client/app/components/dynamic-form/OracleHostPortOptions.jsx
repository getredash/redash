import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Form from "antd/lib/form";
import Checkbox from "antd/lib/checkbox";
import DynamicFormField from "./DynamicFormField";
import getFieldLabel from "./getFieldLabel";

export default function OracleHostPortOptions({ fields, form, feedbackIcons }) {
  const [useCustomHostPort, setUseCustomHostPort] = useState(false);

  useEffect(() => {
    if (useCustomHostPort) {
      form.setFieldsValue({ host: "_useservicename", port: 0 });
    }
  }, [useCustomHostPort, form]);

  const handleCheckboxChange = useCallback(e => {
    setUseCustomHostPort(e.target.checked);
  }, []);

  return (
    <>
      <Form.Item valuePropName="checked">
        <Checkbox checked={useCustomHostPort} onChange={handleCheckboxChange}>
          Use custom host/port
        </Checkbox>
      </Form.Item>
      {fields.map(field => {
        if (useCustomHostPort && (field.name === "host" || field.name === "port")) {
          return (
            <Form.Item
              key={field.name}
              name={field.name}
              style={{ display: "none" }}
              rules={[]}
            >
              <input type="hidden" />
            </Form.Item>
          );
        }

        const fieldLabel = getFieldLabel(field);
        const formItemProps = {
          name: field.name,
          key: field.name,
          className: "m-b-10",
          hasFeedback: field.type !== "checkbox" && field.type !== "file" && feedbackIcons,
          label: field.type === "checkbox" ? "" : fieldLabel,
          rules: field.required ? [{ required: true, message: "This field is required." }] : [],
          valuePropName: field.type === "checkbox" ? "checked" : "value",
        };
        return (
          <Form.Item {...formItemProps}>
            <DynamicFormField field={field} form={form} />
          </Form.Item>
        );
      })}
    </>
  );
}

OracleHostPortOptions.propTypes = {
  fields: PropTypes.array.isRequired,
  form: PropTypes.object.isRequired,
  feedbackIcons: PropTypes.bool,
};
