import React from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '@red... Remove this comment to see the full error message
import { VisualizationType } from "@redash/viz/lib";
import Link from "@/components/Link";
import VisualizationName from "@/components/visualizations/VisualizationName";

import "./QueryLink.less";

type OwnProps = {
    query: any;
    visualization?: VisualizationType;
    readOnly?: boolean;
};

type Props = OwnProps & typeof QueryLink.defaultProps;

function QueryLink({ query, visualization, readOnly }: Props) {
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
    <Link href={readOnly ? null : getUrl()} className="query-link">
      <VisualizationName visualization={visualization} /> <span>{query.name}</span>
    </Link>
  );
}

QueryLink.defaultProps = {
  visualization: null,
  readOnly: false,
};

export default QueryLink;
