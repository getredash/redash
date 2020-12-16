import React from "react";
import Button from "antd/lib/button";

function DefaultLinkComponent(props: any) {
  return <a {...props} />; // eslint-disable-line jsx-a11y/anchor-has-content
}

function Link(props: any) {
  return <Link.Component {...props} />;
}

Link.Component = DefaultLinkComponent;

function DefaultButtonLinkComponent(props: any) {
  return <Button role="button" {...props} />;
}

function ButtonLink(props: any) {
  return <ButtonLink.Component {...props} />;
}

ButtonLink.Component = DefaultButtonLinkComponent;

Link.Button = ButtonLink;

export default Link;
