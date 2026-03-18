import React from "react";
import PropTypes from "prop-types";
import Link from "@/components/Link";

const EMPTY_QUERY_RESULT = {};

export default function QueryResultsLink({
  query,
  queryResult = EMPTY_QUERY_RESULT,
  fileType = "csv",
  disabled,
  embed = false,
  apiKey = "",
  children,
}) {
  let href = "";

  const resultId = queryResult.getId && queryResult.getId();
  const resultData = queryResult.getData && queryResult.getData();

  if (resultId && resultData && query.name) {
    if (query.id) {
      href = `api/queries/${query.id}/results/${resultId}.${fileType}${embed ? `?api_key=${apiKey}` : ""}`;
    } else {
      href = `api/query_results/${resultId}.${fileType}`;
    }
  }

  return (
    <Link target="_blank" rel="noopener noreferrer" disabled={disabled} href={href} download>
      {children}
    </Link>
  );
}

QueryResultsLink.propTypes = {
  query: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  queryResult: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  fileType: PropTypes.string,
  disabled: PropTypes.bool.isRequired,
  embed: PropTypes.bool,
  apiKey: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
};
