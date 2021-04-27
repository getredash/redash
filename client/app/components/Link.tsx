import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";
import { ExternalIconText, IconTextProps } from "./IconText";
import { isLocalURL } from "@/lib/urlUtils";

function DefaultLinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

Link.Component = DefaultLinkComponent;

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role" | "type"> {
  href: string;
  target?: never;
}

type ExternalLinkProps = LinkProps & { children: React.ReactText };

function ExternalLink(props: ExternalLinkProps) {
  return <ExternalIconText wrapper={Link.Component} target="_blank" rel="noopener noreferrer" {...props} />;
}
function Link(props: LinkProps) {
  const areChildrenText = typeof props.children === "object";
  const isURLExternal = !isLocalURL(props.href);

  if (isURLExternal && !areChildrenText) {
    console.warn(
      "External link was rendered as regular link. Please provide `ReactText` as children to render as external."
    );
  }

  return isURLExternal && areChildrenText ? (
    <ExternalLink {...(props as ExternalLinkProps)} />
  ) : (
    <Link.Component {...props} />
  );
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
