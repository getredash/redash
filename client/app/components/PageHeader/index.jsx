import React from "react";
import PropTypes from "prop-types";

import "./index.less";

export default function PageHeader({ title, actions }) {
  return (
    <div className="page-header-wrapper">
      <h3>{title}</h3>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string,
  actions: PropTypes.node,
};

PageHeader.defaultProps = {
  title: "",
  actions: null,
};
