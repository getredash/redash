import React from "react";
import Link from "@/components/Link";

type OwnProps = {
    query: any;
    queryResult?: any;
    fileType?: string;
    disabled: boolean;
    embed?: boolean;
    apiKey?: string;
    children: React.ReactNode[] | React.ReactNode;
};

type Props = OwnProps & typeof QueryResultsLink.defaultProps;

export default function QueryResultsLink(props: Props) {
  let href = "";

  const { query, queryResult, fileType } = props;
  const resultId = queryResult.getId && queryResult.getId();
  const resultData = queryResult.getData && queryResult.getData();

  if (resultId && resultData && query.name) {
    if (query.id) {
      href = `api/queries/${query.id}/results/${resultId}.${fileType}${props.embed ? `?api_key=${props.apiKey}` : ""}`;
    } else {
      href = `api/query_results/${resultId}.${fileType}`;
    }
  }

  return (
    <Link target="_blank" rel="noopener noreferrer" disabled={props.disabled} href={href} download>
      {props.children}
    </Link>
  );
}

QueryResultsLink.defaultProps = {
  queryResult: {},
  fileType: "csv",
  embed: false,
  apiKey: "",
};
