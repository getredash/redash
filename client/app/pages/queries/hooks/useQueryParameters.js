import { isUndefined } from "lodash";
import { useEffect, useMemo, useState, useCallback } from "react";

export default function useQueryParameters(query) {
  // query.getParametersDefs() implicitly depends on query.query
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const parameters = useMemo(() => query.getParametersDefs(), [query, query.query]);

  const [dirtyFlag, setDirtyFlag] = useState(query.getParameters().hasPendingValues());

  const updateDirtyFlag = useCallback(
    flag => {
      flag = isUndefined(flag) ? query.getParameters().hasPendingValues() : flag;
      setDirtyFlag(flag);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, query.query] // query.getParameters() implicitly depends on query.query
  );

  useEffect(() => {
    const updatedDirtyParameters = query.getParameters().hasPendingValues();
    if (updatedDirtyParameters !== dirtyFlag) {
      setDirtyFlag(updatedDirtyParameters);
    }
  }, [query, query.query, parameters, dirtyFlag]); // query.getParameters() implicitly depends on query.query

  return useMemo(() => [parameters, dirtyFlag, updateDirtyFlag], [parameters, dirtyFlag, updateDirtyFlag]);
}
