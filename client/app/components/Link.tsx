import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role"> {
  href: string;
}

interface ButtonProps extends AntdButtonProps {
  href: string;
}

function DefaultLinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

Link.Component = DefaultLinkComponent;

function Link({ tabIndex = 0, ...props }: LinkProps) {
  return <Link.Component tabIndex={tabIndex} {...props} />;
}

// Ant Button will render an <a> if href is present.
function DefaultButtonLinkComponent(props: ButtonProps) {
  return <Button {...props} />;
}

ButtonLink.Component = DefaultButtonLinkComponent;

function ButtonLink(props: ButtonProps) {
  return <ButtonLink.Component {...props} />;
}

Link.Button = ButtonLink;

export default Link;
