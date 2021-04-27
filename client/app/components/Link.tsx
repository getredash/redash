import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";
import { ExternalIconText, IconTextProps } from "./IconText";

function DefaultLinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

Link.Component = DefaultLinkComponent;

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role" | "type"> {
  href: string;
  target?: never; // use external link
}
function Link({ children, ...props }: LinkProps) {
  return <Link.Component {...props}>{children}</Link.Component>;
}

function ExternalLink(props: LinkProps & Partial<IconTextProps>) {
  return <ExternalIconText wrapper={Link.Component} target="_blank" rel="noopener noreferrer" {...props} />;
}

Link.External = ExternalLink;

// Ant Button will render an <a> if href is present.
function DefaultButtonLinkComponent(props: ButtonProps) {
  return <Button {...props} />;
}

ButtonLink.Component = DefaultButtonLinkComponent;

interface ButtonProps extends AntdButtonProps {
  href: string;
}

function ButtonLink(props: ButtonProps) {
  return <ButtonLink.Component {...props} />;
}

Link.Button = ButtonLink;

export default Link;
