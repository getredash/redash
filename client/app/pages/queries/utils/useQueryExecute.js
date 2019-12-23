import { useState, useMemo } from "react";
import { includes } from "lodash";
import useQueryResult from "@/lib/hooks/useQueryResult";
import { useCallback } from "react";
import { $location } from "@/services/ng";
import { useEffect } from "react";

function getMaxAge() {
  const maxAge = $location.search().maxAge;
  return maxAge !== undefined ? maxAge : -1;
}

export default function useQueryExecute(query) {
  const [queryResult, setQueryResult] = useState(
    query.hasResult() || query.paramsRequired() ? query.getQueryResult(getMaxAge()) : null
  );
  const queryResultData = useQueryResult(queryResult);
  const isQueryExecuting = useMemo(() => queryResult && !includes(["done", "failed"], queryResultData.status), [
    queryResult,
    queryResultData.status,
  ]);

  const executeQuery = useCallback(() => setQueryResult(query.getQueryResult(0)), [query]);

  const executeAdhocQuery = useCallback(
    selectedQueryText => setQueryResult(query.getQueryResultByText(0, selectedQueryText)),
    [query]
  );

  useEffect(() => {
    if (!isQueryExecuting && queryResult && queryResult.query_result.query === query.query) {
      query.latest_query_data_id = queryResult.getId();
      query.queryResult = queryResult;
    }
  }, [isQueryExecuting]); // eslint-disable-line react-hooks/exhaustive-deps

  return { queryResult, queryResultData, isQueryExecuting, executeQuery, executeAdhocQuery };
}
