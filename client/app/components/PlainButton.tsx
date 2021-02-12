import classNames from "classnames";
import React from "react";

import "./PlainButton.less";

function PlainButton({ className, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  return <button className={classNames("plain-button", "clickable", className)} type="button" {...props} />;
}

export default PlainButton;
