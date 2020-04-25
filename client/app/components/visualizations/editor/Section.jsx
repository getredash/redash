import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import "./Section.less";

function SectionTitle({ className, children, ...props }) {
  if (!children) {
    return null;
  }

  return (
    <h4 className={cx("visualization-editor-section-title", className)} {...props}>
      {children}
    </h4>
  );
}

SectionTitle.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

SectionTitle.defaultProps = {
  className: null,
  children: null,
};

export default function Section({ className, children, ...props }) {
  return (
    <div className={cx("visualization-editor-section", className)} {...props}>
      {children}
    </div>
  );
}

Section.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

Section.defaultProps = {
  className: null,
  children: null,
};

Section.Title = SectionTitle;
