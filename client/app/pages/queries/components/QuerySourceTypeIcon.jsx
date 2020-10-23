import PropTypes from "prop-types";
import React from "react";

export function QuerySourceTypeIcon(props) {
  return <img src={`/static/images/db-logos/${props.type}.png`} width="20" alt={props.alt} />;
}

QuerySourceTypeIcon.propTypes = {
  type: PropTypes.string,
  alt: PropTypes.string,
};
