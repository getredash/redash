import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role" | "type" | "target"> {
  href: string;
}

interface ExternalLinkProps extends LinkProps {
  children: string;
  externalLink?: {
    icon: JSX.Element;
    alt: string;
  };
}

interface ButtonProps extends AntdButtonProps {
  href: string;
}

function DefaultLinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

Link.Component = DefaultLinkComponent;

function Link({ tabIndex = 0, children, ...props }: LinkProps) {
  return (
    <Link.Component tabIndex={tabIndex} {...props}>
      {children}
    </Link.Component>
  );
}

function ExternalLink({ tabIndex = 0, children, externalLink, ...props }: ExternalLinkProps) {
  const externalLinkProps = { target: "_blank", rel: "noopener noreferrer" };
  const icon = externalLink?.icon || <i className="fa fa-external-link" aria-hidden="true" />;
  const alt = externalLink?.alt || "(opens in a new tab)";

  return (
    <Link.Component tabIndex={tabIndex} {...externalLinkProps} {...props}>
      {children} {icon} <span className="sr-only">{alt}</span>
    </Link.Component>
  );
}

Link.External = ExternalLink;

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
