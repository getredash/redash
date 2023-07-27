import { FormProps } from "antd/lib/form/Form";
import { FormItemProps } from "antd/lib/form/FormItem";
import "./formStyle.less";

export function getHorizontalFormProps(): FormProps {
  return {
    labelCol: { xs: { span: 24 }, sm: { span: 6 }, lg: { span: 4 } },
    wrapperCol: { xs: { span: 24 }, sm: { span: 12 }, lg: { span: 10 } },
    layout: "horizontal",
    className: "ant-form-horizontal--labels-left",
  };
}

export function getHorizontalFormItemWithoutLabelProps(): FormItemProps {
  return {
    wrapperCol: { xs: { span: 24 }, sm: { span: 12, offset: 6 }, lg: { span: 12, offset: 4 } },
  };
}
