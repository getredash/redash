import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

import "./content-with-sidebar.less";

const propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

const defaultProps = {
  className: null,
  children: null,
};

// Sidebar

function Sidebar({ className, children, ...props }) {
  return (
    <div className={classNames("layout-sidebar", className)} {...props}>
      <div>{children}</div>
    </div>
  );
}

Sidebar.propTypes = propTypes;
Sidebar.defaultProps = defaultProps;

// Content

function Content({ className, children, ...props }) {
  return (
    <div className={classNames("layout-content", className)} {...props}>
      <div>{children}</div>
    </div>
  );
}

Content.propTypes = propTypes;
Content.defaultProps = defaultProps;

// Layout

export default function Layout({ className, children, ...props }) {
  return (
    <div className={classNames("layout-with-sidebar", className)} {...props}>
      {children}
    </div>
  );
}

Layout.propTypes = propTypes;
Layout.defaultProps = defaultProps;

Layout.Sidebar = Sidebar;
Layout.Content = Content;
