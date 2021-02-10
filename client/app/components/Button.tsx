import AntdButton, { ButtonProps as AntdButtonProps } from "antd/lib/button";
import React from "react";

import "./Button.less";

interface ButtonProps extends Omit<AntdButtonProps, "type"> {
  type?: AntdButtonProps["type"] | "plain";
}

function Button({ type, ...props }: ButtonProps) {
  return type === "plain" ? <button className="btn-plain" {...props} /> : <AntdButton type={type} {...props} />;
}

export default Button;
