import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { noop, includes } from "lodash";
import useQueryResult from "@/lib/hooks/useQueryResult";
import { $location } from "@/services/ng";
import recordEvent from "@/services/recordEvent";

function getMaxAge() {
  const maxAge = $location.search().maxAge;
  return maxAge !== undefined ? maxAge : -1;
}

export default function useQueryExecute(query) {
  // Query result should be initialized only once on component mount
  const initializeQueryResultRef = useRef(() =>
    query.hasResult() || query.paramsRequired() ? query.getQueryResult(getMaxAge()) : null
  );
  const [queryResult, setQueryResult] = useState(initializeQueryResultRef.current());
  initializeQueryResultRef.current = noop;

  const queryResultData = useQueryResult(queryResult);
  const isQueryExecuting = useMemo(() => !!queryResult && !includes(["done", "failed"], queryResultData.status), [
    queryResult,
    queryResultData.status,
  ]);

  const [isExecutionCancelling, setIsExecutionCancelling] = useState(false);

  const executeQuery = useCallback(() => {
    recordEvent("execute", "query", query.id);
    setQueryResult(query.getQueryResult(0));
  }, [query]);

  const executeAdhocQuery = useCallback(
    selectedQueryText => {
      recordEvent("execute", "query", query.id);
      setQueryResult(query.getQueryResultByText(0, selectedQueryText));
    },
    [query]
  );

  const cancelExecution = useCallback(() => {
    if (queryResult) {
      recordEvent("cancel_execute", "query", query.id);
      queryResult.cancelExecution();
      setIsExecutionCancelling(true);
    }
  }, [query.id, queryResult]);

  useEffect(() => {
    if (!isQueryExecuting) {
      setIsExecutionCancelling(false);
      if (queryResult && queryResult.query_result.query === query.query) {
        query.latest_query_data_id = queryResult.getId();
        query.queryResult = queryResult;
      }
    }
  }, [isQueryExecuting]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(
    () => ({
      queryResult,
      queryResultData,
      isQueryExecuting,
      isExecutionCancelling,
      executeQuery,
      executeAdhocQuery,
      cancelExecution,
    }),
    [
      queryResult,
      queryResultData,
      isQueryExecuting,
      isExecutionCancelling,
      executeQuery,
      executeAdhocQuery,
      cancelExecution,
    ]
  );
}
