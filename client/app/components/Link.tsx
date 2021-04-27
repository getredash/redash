import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";
import { ExternalIconText } from "./IconText";
import { isLocalURL } from "@/lib/urlUtils";

function DefaultLinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

Link.Component = DefaultLinkComponent;

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role" | "type"> {
  href: string;
  target?: never;
}
function Link(props: LinkProps) {
  return isLocalURL(props.href) ? (
    <Link.Component {...props} />
  ) : (
    <Link.Component target="_blank" rel="noopener noreferrer" {...props} />
  );
}

export type ExternalIconLinkProps = LinkProps & { children: React.ReactText };

export function ExternalIconLink(props: ExternalIconLinkProps) {
  return <ExternalIconText wrapper={Link} {...props} />;
}

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
