import React from "react";
import cx from "classnames";
import Form from "antd/lib/form";
type OwnProps = {
    children?: React.ReactNode;
    label?: string;
    className?: string;
};
type Props = OwnProps & typeof HorizontalFormItem.defaultProps;
// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function HorizontalFormItem({ children, label, className, ...props }: Props) {
    const labelCol = { span: 4 };
    const wrapperCol = { span: 16 };
    if (!label) {
        (wrapperCol as any).offset = 4;
    }
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
    className = cx("alert-form-item", className);
    return (<Form.Item labelCol={labelCol} wrapperCol={wrapperCol} label={label} className={className} {...props}>
      {children}
    </Form.Item>);
}
HorizontalFormItem.defaultProps = {
    children: null,
    label: null,
    className: null,
};
