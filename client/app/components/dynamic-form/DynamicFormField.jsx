import React from "react";
import { get } from "lodash";
import PropTypes from "prop-types";
import getFieldLabel from "./getFieldLabel";

import {
  AceEditorField,
  CheckboxField,
  ContentField,
  FileField,
  InputField,
  NumberField,
  SelectField,
  TextAreaField,
} from "./fields";

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

const FieldTypeComponent = {
  checkbox: CheckboxField,
  file: FileField,
  select: SelectField,
  number: NumberField,
  textarea: TextAreaField,
  ace: AceEditorField,
  content: ContentField,
};

export default function DynamicFormField({ form, field, ...otherProps }) {
  const { name, type, readOnly, autoFocus } = field;
  const fieldLabel = getFieldLabel(field);

  const fieldProps = {
    ...field.props,
    className: "w-100",
    name,
    type,
    readOnly,
    autoFocus,
    placeholder: field.placeholder,
    "data-test": fieldLabel,
    ...otherProps,
  };

  const FieldComponent = get(FieldTypeComponent, type, InputField);
  return <FieldComponent {...fieldProps} form={form} field={field} />;
}

DynamicFormField.propTypes = { field: FieldType.isRequired };
