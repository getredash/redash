import React from "react";
import PropTypes from "prop-types";
import { VisualizationType } from "@redash/viz/lib";
import Link from "@/components/Link";
import VisualizationName from "@/components/visualizations/VisualizationName";

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

  const QueryLinkWrapper = props => (readOnly ? <span {...props} /> : <Link href={getUrl()} {...props} />);

  return (
    <QueryLinkWrapper className="query-link">
      <VisualizationName visualization={visualization} /> <span>{query.name}</span>
    </QueryLinkWrapper>
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
