import { useReducer, useCallback, useEffect } from "react";
import location from "@/services/location";
import recordEvent from "@/services/recordEvent";
import { ExecutionStatus } from "@/services/query-result";

function getMaxAge() {
  const { maxAge } = location.search;
  return maxAge !== undefined ? maxAge : -1;
}

const reducer = (prevState, updatedProperty) => ({
  ...prevState,
  ...updatedProperty,
});

// This is currently specific to a Query page, we can refactor
// it slightly to make it suitable for dashboard widgets instead of the other solution it
// has in there.
export default function useQueryExecute(query) {
  const [executionState, setExecutionState] = useReducer(reducer, {
    queryResult: null,
    isExecuting: false,
    executionStatus: null,
    isCancelling: false,
    cancelCallback: null,
    error: null,
  });

  const executeQuery = useCallback(
    (maxAge = 0, queryExecutor) => {
      let newQueryResult;
      if (queryExecutor) {
        newQueryResult = queryExecutor();
      } else {
        newQueryResult = query.getQueryResult(maxAge);
      }

      setExecutionState({
        updatedAt: newQueryResult.getUpdatedAt(),
        isExecuting: true,
        cancelCallback: () => {
          recordEvent("cancel_execute", "query", query.id);
          setExecutionState({ isCancelling: true });
          newQueryResult.cancelExecution();
        },
      });

      const onStatusChange = status => {
        setExecutionState({ updatedAt: newQueryResult.getUpdatedAt(), executionStatus: status });
      };

      newQueryResult
        .toPromise(onStatusChange)
        .then(queryResult => {
          // TODO: this should probably belong in the QueryEditor page.
          if (queryResult && queryResult.query_result.query === query.query) {
            query.latest_query_data_id = queryResult.getId();
            query.queryResult = queryResult;
          }

          setExecutionState({
            queryResult,
            error: null,
            isExecuting: false,
            isCancelling: false,
            executionStatus: null,
          });
        })
        .catch(queryResult => {
          setExecutionState({
            queryResult,
            error: queryResult.getError(),
            isExecuting: false,
            isCancelling: false,
            executionStatus: ExecutionStatus.FAILED,
          });
        });
    },
    [query]
  );

  useEffect(() => {
    // TODO: this belongs on the query page?
    if (query.hasResult() || query.paramsRequired()) {
      executeQuery(getMaxAge());
    }
  }, [query, executeQuery]);

  return { ...executionState, ...{ executeQuery } };
}
