import { useCallback, useMemo, useState } from "react";
import localOptions from "@/lib/localOptions";
import { extend } from "lodash";

function isAutoLimitAvailable(dataSource) {
  return dataSource !== null && dataSource.apply_auto_limit;
}

export default function useAutoLimitFlags(dataSource, query, setQuery) {
  const isAvailable = useMemo(() => isAutoLimitAvailable(dataSource), [dataSource]);
  const [isChecked, setIsChecked] = useState(localOptions.get("ApplyAutoLimit", true));
  query.options.applyAutoLimit = isAvailable && isChecked;

  const checkboxAutoLimit = useCallback(
    state => {
      setIsChecked(state);
      localOptions.set("ApplyAutoLimit", state);
      setQuery(extend(query.clone(), { options: { ...query.options, applyAutoLimit: isAvailable && state } }));
    },
    [query, setQuery, isAvailable]
  );

  return useMemo(() => [isAvailable, isChecked, checkboxAutoLimit], [isAvailable, isChecked, checkboxAutoLimit]);
}
