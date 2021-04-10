import classNames from "classnames";
import React from "react";

import "./PlainButton.less";

export interface PlainButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  type?: "link" | "button";
}

function PlainButton({ className, type, ...rest }: PlainButtonProps) {
  return (
    <button
      className={classNames("plain-button", "clickable", { "plain-button-link": type === "link" }, className)}
      type="button"
      {...rest}
    />
  );
}

export default PlainButton;
