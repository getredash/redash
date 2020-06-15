import React from "react";
import PropTypes from "prop-types";

export default function PageHeader({ title }) {
  return (
    <div className="page-header-wrapper">
      <h3>{title}</h3>
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
};
