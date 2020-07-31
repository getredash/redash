import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Input from "antd/lib/input";
import InputNumber from "antd/lib/input-number";
import Checkbox from "antd/lib/checkbox";
import Select from "antd/lib/select";
import Upload from "antd/lib/upload";
import UploadOutlinedIcon from "@ant-design/icons/UploadOutlined";
import AceEditorInput from "@/components/AceEditorInput";
import { toHuman } from "@/lib/utils";

export function getFieldLabel(field) {
  const { title, name } = field;
  return title || toHuman(name);
}

export const FieldType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  title: PropTypes.string,
  type: PropTypes.oneOf([
    "ace",
    "text",
    "textarea",
    "email",
    "password",
    "number",
    "checkbox",
    "file",
    "select",
    "content",
  ]).isRequired,
  initialValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.arrayOf(PropTypes.number),
  ]),
  content: PropTypes.node,
  mode: PropTypes.string,
  required: PropTypes.bool,
  extra: PropTypes.bool,
  readOnly: PropTypes.bool,
  autoFocus: PropTypes.bool,
  minLength: PropTypes.number,
  placeholder: PropTypes.string,
  contentAfter: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  loading: PropTypes.bool,
  props: PropTypes.object, // eslint-disable-line react/forbid-prop-types
});

export default function DynamicFormField({ form, field, ...otherProps }) {
  const { name, type, readOnly, autoFocus, initialValue } = field;
  const fieldLabel = getFieldLabel(field);

  const fieldProps = {
    ...field.props,
    className: "w-100",
    name,
    type,
    readOnly,
    autoFocus,
    placeholder: field.placeholder,
    ...otherProps,
  };

  switch (type) {
    case "checkbox":
      return <Checkbox {...fieldProps}>{fieldLabel}</Checkbox>;
    case "file":
      const { getFieldValue } = form;
      const disabled = getFieldValue(name) !== undefined && getFieldValue(name) !== initialValue;
      return (
        <Upload {...fieldProps} beforeUpload={() => false}>
          <Button disabled={disabled}>
            <UploadOutlinedIcon /> Click to upload
          </Button>
        </Upload>
      );
    case "select":
      return (
        <Select
          {...fieldProps}
          optionFilterProp="children"
          loading={field.loading || false}
          mode={field.mode}
          getPopupContainer={trigger => trigger.parentNode}>
          {field.options &&
            field.options.map(option => (
              <Select.Option key={`${option.value}`} value={option.value} disabled={readOnly}>
                {option.name || option.value}
              </Select.Option>
            ))}
        </Select>
      );
    case "content":
      return field.content;
    case "number":
      return <InputNumber {...fieldProps} />;
    case "textarea":
      return <Input.TextArea {...fieldProps} />;
    case "ace":
      return <AceEditorInput {...fieldProps} />;
    default:
      return <Input {...fieldProps} />;
  }
}

DynamicFormField.propTypes = { field: FieldType.isRequired };
