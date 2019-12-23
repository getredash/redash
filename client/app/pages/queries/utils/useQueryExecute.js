import { useState, useMemo, useEffect } from "react";
import { includes } from "lodash";
import useQueryResult from "@/lib/hooks/useQueryResult";
import { useCallback } from "react";
import { $location } from "@/services/ng";

function getMaxAge() {
  const maxAge = $location.search().maxAge;
  return maxAge !== undefined ? maxAge : -1;
}

export default function useQueryExecute(query) {
  // This variable should be initialized only once on component mount
  const initialQueryResult = useMemo(
    () => (query.hasResult() || query.paramsRequired() ? query.getQueryResult(getMaxAge()) : null),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [queryResult, setQueryResult] = useState(initialQueryResult);
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
