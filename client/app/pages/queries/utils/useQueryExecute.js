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
  const [queryResult, setQueryResult] = useState(query.getQueryResult(getMaxAge()));
  const queryResultData = useQueryResult(queryResult);
  const queryExecuting = useMemo(() => !includes(["done", "failed"], queryResultData.status), [queryResultData.status]);

  const executeQuery = useCallback(() => setQueryResult(query.getQueryResult(0)), [query]);

  const executeQueryWithText = useCallback(
    selectedQueryText => setQueryResult(query.getQueryResultByText(0, selectedQueryText)),
    [query]
  );

  useEffect(() => {
    if (!queryExecuting && queryResult.query_result.query === query.query) {
      query.latest_query_data_id = queryResult.getId();
      query.queryResult = queryResult;
    }
  }, [queryExecuting]); // eslint-disable-line react-hooks/exhaustive-deps

  return { queryResult, queryResultData, queryExecuting, executeQuery, executeQueryWithText };
}
