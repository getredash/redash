import React from "react";
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
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'type' does not exist on type 'never'.
      if (visualization.type === "TABLE") {
        // link to hard-coded table tab instead of the (hidden) visualization tab
        hash = "table";
      } else {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
        hash = visualization.id;
      }
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'getUrl' does not exist on type 'never'.
    return query.getUrl(false, hash);
  };

  return (
    <Link href={readOnly ? null : getUrl()} className="query-link">
      {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'. */}
      <VisualizationName visualization={visualization} /> <span>{query.name}</span>
    </Link>
  );
}

QueryLink.defaultProps = {
  visualization: null,
  readOnly: false,
};

export default QueryLink;
