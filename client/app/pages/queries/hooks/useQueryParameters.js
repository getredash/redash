import { isUndefined } from "lodash";
import { useEffect, useMemo, useState, useCallback } from "react";

export default function useQueryParameters(query) {
  const parameters = useMemo(() => query.getParametersDefs(), [query]);
  const [dirtyFlag, setDirtyFlag] = useState(query.getParameters().hasPendingValues());

  const updateDirtyFlag = useCallback(
    flag => {
      flag = isUndefined(flag) ? query.getParameters().hasPendingValues() : flag;
      setDirtyFlag(flag);
    },
    [query]
  );

  useEffect(() => {
    const updatedDirtyParameters = query.getParameters().hasPendingValues();
    if (updatedDirtyParameters !== dirtyFlag) {
      setDirtyFlag(updatedDirtyParameters);
    }
  }, [query, parameters, dirtyFlag]);

  return useMemo(() => [parameters, dirtyFlag, updateDirtyFlag], [parameters, dirtyFlag, updateDirtyFlag]);
}
