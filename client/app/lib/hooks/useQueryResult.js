import { useState, useEffect } from 'react';
import { isFunction } from 'lodash';

function getQueryResultData(queryResult) {
  return {
    columns: (queryResult && isFunction(queryResult.getColumns) && queryResult.getColumns()) || [],
    rows: (queryResult && isFunction(queryResult.getData) && queryResult.getData()) || [],
    filters: (queryResult && isFunction(queryResult.getFilters) && queryResult.getFilters()) || [],
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
