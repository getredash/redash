import React from "react";
import Button, { ButtonProps as AntdButtonProps } from "antd/lib/button";

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role" | "type" | "target"> {
  href: string;
  type: "regular" | "external";
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

function Link({ tabIndex = 0, type, children, externalLink, ...props }: LinkProps) {
  const isLinkExternal = type === "external";
  const areChildrenText = typeof children === "string";
  const externalLinkProps = isLinkExternal ? { target: "_blank", rel: "noopener noreferrer" } : {};

  return (
    <Link.Component tabIndex={tabIndex} {...externalLinkProps} {...props}>
      {children}
      {isLinkExternal && areChildrenText && (
        <>
          {" "}
          {externalLink?.icon || <i className="fa fa-external-link" aria-hidden="true" />}
          <span className="sr-only">{externalLink?.alt || "(opens in a new tab)"}</span>
        </>
      )}
    </Link.Component>
  );
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
