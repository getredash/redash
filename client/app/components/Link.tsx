import React from "react";
import { ButtonProps as AntdButtonProps } from "antd/lib/button";

interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "role"> {
  href: string;
}

interface ButtonProps extends LinkProps {
  type: AntdButtonProps["type"];
}

function DefaultLinkComponent({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props}>{children}</a>;
}

Link.Component = DefaultLinkComponent;

function Link({ tabIndex = 0, ...props }: LinkProps) {
  return <Link.Component tabIndex={tabIndex} {...props} />;
}

function DefaultButtonLinkComponent({ children, type, ...props }: ButtonProps) {
  return (
    <a className={`ant-btn ${type ? "ant-btn-" + type : ""}`} role="button" {...props}>
      {children}
    </a>
  );
}

ButtonLink.Component = DefaultButtonLinkComponent;

function ButtonLink(props: ButtonProps) {
  return <ButtonLink.Component {...props} />;
}

Link.Button = ButtonLink;

export default Link;
