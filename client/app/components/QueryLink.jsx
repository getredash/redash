import React from "react";
import PropTypes from "prop-types";
import { VisualizationType } from "@/visualizations";
import VisualizationName from "@/visualizations/VisualizationName";

import "./QueryLink.less";

function QueryLink({ query, visualization, readOnly }) {
  const getUrl = () => {
    let hash = null;
    if (visualization) {
      if (visualization.type === "TABLE") {
        // link to hard-coded table tab instead of the (hidden) visualization tab
        hash = "table";
      } else {
        hash = visualization.id;
      }
    }

    return query.getUrl(false, hash);
  };

  return (
    <a href={readOnly ? null : getUrl()} className="query-link">
      <VisualizationName visualization={visualization} /> <span>{query.name}</span>
    </a>
  );
}

QueryLink.propTypes = {
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  visualization: VisualizationType,
  readOnly: PropTypes.bool,
};

QueryLink.defaultProps = {
  visualization: null,
  readOnly: false,
};

export default QueryLink;
