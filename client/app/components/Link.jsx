import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";

function DefaultLinkComponent(props) {
  const href = useMemo(() => Link.modifyHref(props.href), [props.href]);

  return <a href={href} {...props} />; // eslint-disable-line jsx-a11y/anchor-has-content
}

DefaultLinkComponent.propTypes = {
  href: PropTypes.string,
};

DefaultLinkComponent.defaultProps = {
  href: null,
};

function Link(props) {
  return <Link.Component {...props} />;
}

Link.Component = DefaultLinkComponent;

function DefaultButtonLinkComponent(props) {
  const href = useMemo(() => Link.modifyHref(props.href), [props.href]);

  return <Button href={href} {...props} />;
}

DefaultButtonLinkComponent.propTypes = {
  href: PropTypes.string,
};

DefaultButtonLinkComponent.defaultProps = {
  href: null,
};

function ButtonLink(props) {
  return <ButtonLink.Component {...props} />;
}

ButtonLink.Component = DefaultButtonLinkComponent;

Link.Button = ButtonLink;

Link.modifyHref = href => href;

export default Link;
