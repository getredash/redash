import { useState, useEffect } from 'react';

function getQueryResultData(queryResult) {
  return {
    columns: queryResult ? queryResult.getColumns() : [],
    rows: queryResult ? queryResult.getData() : [],
    filters: queryResult ? queryResult.getFilters() : [],
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
