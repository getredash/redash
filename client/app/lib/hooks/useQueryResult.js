import { useState, useEffect } from 'react';
import { invoke } from 'lodash';

function getQueryResultData(queryResult) {
  return {
    columns: invoke(queryResult, 'getColumns') || [],
    rows: invoke(queryResult, 'getData') || [],
    filters: invoke(queryResult, 'getFilters') || [],
  };
}

export default function useQueryResult(queryResult) {
  const [data, setData] = useState(getQueryResultData(queryResult));
  let isCancelled = false;
  useEffect(() => {
    if (queryResult) {
      queryResult.toPromise()
        .then(() => {
          if (!isCancelled) {
            setData(getQueryResultData(queryResult));
          }
        });
    } else {
      setData(getQueryResultData(queryResult));
    }
    return () => {
      isCancelled = true;
    };
  }, [queryResult]);
  return data;
}
