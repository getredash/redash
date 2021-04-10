import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";
import { withIcon, WithIconProps } from "./WithIcon";

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

Link.WithIcon = withIcon(Link.Component);

function ExternalLink({
  icon = <i className="fa fa-external-link" aria-hidden="true" />,
  alt = "(opens in a new tab)",
  ...props
}: LinkProps & Partial<WithIconProps>) {
  return <Link.WithIcon target="_blank" rel="noopener noreferrer" icon={icon} alt={alt} {...props} />;
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
