import { get, invoke } from "lodash";

export default function getQueryResultData(queryResult) {
  return {
    status: invoke(queryResult, "getStatus") || null,
    columns: invoke(queryResult, "getColumns") || [],
    rows: invoke(queryResult, "getData") || [],
    filters: invoke(queryResult, "getFilters") || [],
    updatedAt: invoke(queryResult, "getUpdatedAt") || null,
    retrievedAt: get(queryResult, "query_result.retrieved_at", null),
    log: invoke(queryResult, "getLog") || [],
    error: invoke(queryResult, "getError") || null,
    runtime: invoke(queryResult, "getRuntime") || null,
    metadata: get(queryResult, "query_result.data.metadata", {}),
  };
}
