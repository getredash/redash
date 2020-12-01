import { useMemo } from "react";
import { get, invoke } from "lodash";

function getQueryResultData(queryResult, queryResultStatus = null) {
  return {
    status: queryResultStatus || invoke(queryResult, "getStatus") || null,
    columns: invoke(queryResult, "getColumns") || [],
    rows: invoke(queryResult, "getData") || [],
    filters: invoke(queryResult, "getFilters") || [],
    updatedAt: invoke(queryResult, "getUpdatedAt") || null,
    retrievedAt: get(queryResult, "query_result.retrieved_at", null),
    truncated: invoke(queryResult, "getTruncated") || null,
    log: invoke(queryResult, "getLog") || [],
    error: invoke(queryResult, "getError") || null,
    runtime: invoke(queryResult, "getRuntime") || null,
    metadata: get(queryResult, "query_result.data.metadata", {}),
  };
}

export default function useQueryResultData(queryResult) {
  // make sure it re-executes when queryResult status changes
  const queryResultStatus = invoke(queryResult, "getStatus");
  return useMemo(() => getQueryResultData(queryResult, queryResultStatus), [queryResult, queryResultStatus]);
}
