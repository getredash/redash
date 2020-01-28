import { includes, get, invoke } from "lodash";
import { useState, useEffect, useRef } from "react";

function getQueryResultStatus(queryResult) {
  return invoke(queryResult, "getStatus") || null;
}

function isFinalStatus(status) {
  return includes(["done", "failed"], status);
}

function getQueryResultData(queryResult) {
  return {
    status: getQueryResultStatus(queryResult),
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

export default function useQueryResult(queryResult) {
  const [data, setData] = useState(getQueryResultData(queryResult));
  const queryResultRef = useRef(queryResult);
  const lastStatusRef = useRef(getQueryResultStatus(queryResult));

  useEffect(() => {
    // This check is needed to avoid unnecessary updates.
    // `useState`/`useRef` hooks use their argument (initial value) only on the first run.
    // When `useEffect` will run for the first time, that values will be already properly
    // initialized, so we just need to start polling.
    // If `queryResult` object will later change - `useState`/`useRef` will not update values;
    // in that case this section will not be skipped and will update internal state properly.
    if (queryResult !== queryResultRef.current) {
      queryResultRef.current = queryResult;
      lastStatusRef.current = getQueryResultStatus(queryResult);
      setData(getQueryResultData(queryResult));
    }

    if (!isFinalStatus(lastStatusRef.current)) {
      let timer = setInterval(() => {
        const currentStatus = getQueryResultStatus(queryResultRef.current);
        if (lastStatusRef.current !== currentStatus) {
          lastStatusRef.current = currentStatus;
          setData(getQueryResultData(queryResultRef.current));
        }

        if (isFinalStatus(currentStatus)) {
          clearInterval(timer);
          timer = null;
        }
      }, 200);

      return () => {
        clearInterval(timer);
      };
    }
  }, [queryResult]);

  return data;
}
