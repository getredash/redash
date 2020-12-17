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
            if ((visualization as any).type === "TABLE") {
                // link to hard-coded table tab instead of the (hidden) visualization tab
                hash = "table";
            }
            else {
                hash = (visualization as any).id;
            }
        }
        return (query as any).getUrl(false, hash);
    };
    return (<Link href={readOnly ? null : getUrl()} className="query-link">
      <VisualizationName visualization={visualization}/> <span>{(query as any).name}</span>
    </Link>);
}
QueryLink.defaultProps = {
    visualization: null,
    readOnly: false,
};
export default QueryLink;
