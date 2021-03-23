import classNames from "classnames";
import React from "react";

import "./PlainButton.less";

interface PlainButtonType extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  type?: "link" | "button";
}

function PlainButton({ className, type, ...rest }: PlainButtonType) {
  return (
    <button
      className={classNames("plain-button", "clickable", { "plain-button-link": type === "link" }, className)}
      type="button"
      {...rest}
    />
  );
}

export default PlainButton;
