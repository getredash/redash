import classNames from "classnames";
import React from "react";

import "./PlainButton.less";

interface PlainButtonType extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  type?: "link" | "button";
}

function PlainButton({ className, type, ...props }: PlainButtonType) {
  return (
    <button
      className={classNames("plain-button", "clickable", type === "link" ? "plain-button-link" : "", className)}
      type="button"
      {...props}
    />
  );
}

export default PlainButton;
