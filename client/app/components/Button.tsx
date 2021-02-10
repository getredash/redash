import AntdButton, { ButtonProps as AntdButtonProps } from "antd/lib/button";
import classNames from "classnames";
import React from "react";

import "./Button.less";

interface ButtonProps extends Omit<AntdButtonProps, "type"> {
  type?: AntdButtonProps["type"] | "plain";
}

function Button({ type, className, ...props }: ButtonProps) {
  return type === "plain" ? (
    <button className={classNames("btn-plain", "clickable", className)} type="button" {...props} />
  ) : (
    <AntdButton type={type} {...props} />
  );
}

Button.Group = AntdButton.Group;

export default Button;
