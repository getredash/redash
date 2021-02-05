import React from "react";
import Button, { ButtonProps } from "antd/lib/button";

function DefaultLinkComponent(props: React.AnchorHTMLAttributes<any>) {
  return <a {...props} />; // eslint-disable-line jsx-a11y/anchor-has-content
}

Link.Component = DefaultLinkComponent;

function Link({ tabIndex = 0, ...props }: React.AnchorHTMLAttributes<any>) {
  return <Link.Component tabIndex={tabIndex} {...props} />;
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
