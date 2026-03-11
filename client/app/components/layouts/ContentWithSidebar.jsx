import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";

import "./content-with-sidebar.less";

const propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

// Sidebar

function Sidebar({ className: className = null, children: children = null, ...props }) {
  return (
    <div className={classNames("layout-sidebar", className)} {...props}>
      <div>{children}</div>
    </div>
  );
}

Sidebar.propTypes = propTypes;

// Content

function Content({ className: className = null, children: children = null, ...props }) {
  return (
    <div className={classNames("layout-content", className)} {...props}>
      <div>{children}</div>
    </div>
  );
}

Content.propTypes = propTypes;

// Layout

export default function Layout({ children: children = null, className = undefined, ...props }) {
  return (
    <div className={classNames("layout-with-sidebar", className)} {...props}>
      {children}
    </div>
  );
}

Layout.propTypes = propTypes;

Layout.Sidebar = Sidebar;
Layout.Content = Content;
