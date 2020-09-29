import React from "react";
import Button from "antd/lib/button";

function DefaultLinkComponent(props) {
  return <a {...props} />; // eslint-disable-line jsx-a11y/anchor-has-content
}

function Link(props) {
  return <Link.Component {...props} />;
}

Link.Component = DefaultLinkComponent;

function DefaultButtonLinkComponent(props) {
  return <Button {...props} />;
}

function ButtonLink(props) {
  return <ButtonLink.Component {...props} />;
}

ButtonLink.Component = DefaultButtonLinkComponent;

Link.Button = ButtonLink;

export default Link;
