import React from "react";
import Button, { ButtonProps } from "antd/lib/button";

type AnchorButtonProps = React.AnchorHTMLAttributes<any> & React.ButtonHTMLAttributes<any>;

// TODO: adapt click handlers to keypress events
function DefaultLinkComponent({ type, role, ...props }: AnchorButtonProps) {
  return role === "button" ? (
    <button type="button" style={{ all: "unset" }} {...props} />
  ) : (
    <a role={role} type={type} {...props} /> // eslint-disable-line jsx-a11y/anchor-has-content
  );
}

Link.Component = DefaultLinkComponent;

function Link({ tabIndex = 0, ...props }: AnchorButtonProps) {
  return !props.href && !props.role ? (
    <Link.Component tabIndex={tabIndex} role="link" {...props} />
  ) : (
    <Link.Component tabIndex={tabIndex} {...props} />
  );
}

function DefaultButtonLinkComponent(props: ButtonProps) {
  return <Button {...props} />;
}

ButtonLink.Component = DefaultButtonLinkComponent;

function ButtonLink(props: ButtonProps) {
  return <ButtonLink.Component {...props} />;
}

Link.Button = ButtonLink;

export default Link;
