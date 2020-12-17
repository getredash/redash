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

type FieldType = {
    name: string;
    title?: string;
    type: "ace" | "text" | "textarea" | "email" | "password" | "number" | "checkbox" | "file" | "select" | "content";
    initialValue?: string | number | boolean | string[] | number[];
    content?: React.ReactNode;
    mode?: string;
    required?: boolean;
    extra?: boolean;
    readOnly?: boolean;
    autoFocus?: boolean;
    minLength?: number;
    placeholder?: string;
    contentAfter?: React.ReactNode | ((...args: any[]) => any);
    loading?: boolean;
    props?: any;
};

// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ name: Validator<str... Remove this comment to see the full error message
const FieldType: PropTypes.Requireable<FieldType> = PropTypes.shape({
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
    props: PropTypes.object,
});
export { FieldType };

const FieldTypeComponent = {
  checkbox: CheckboxField,
  file: FileField,
  select: SelectField,
  number: NumberField,
  textarea: TextAreaField,
  ace: AceEditorField,
  content: ContentField,
};

type Props = {
    field: FieldType;
};

// @ts-expect-error ts-migrate(2339) FIXME: Property 'form' does not exist on type 'Props'.
export default function DynamicFormField({ form, field, ...otherProps }: Props) {
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
