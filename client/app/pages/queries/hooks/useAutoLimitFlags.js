import { useCallback, useState } from "react";
import localOptions from "@/lib/localOptions";
import { get, extend } from "lodash";

function isAutoLimitAvailable(dataSource) {
  return get(dataSource, "apply_auto_limit", false);
}

export default function useAutoLimitFlags(dataSource, query, setQuery) {
  const isAvailable = isAutoLimitAvailable(dataSource);
  const [isChecked, setIsChecked] = useState(localOptions.get("applyAutoLimit", true));
  query.options.applyAutoLimit = isAvailable && isChecked;

  const setAutoLimit = useCallback(
    state => {
      setIsChecked(state);
      localOptions.set("applyAutoLimit", state);
      setQuery(extend(query.clone(), { options: { ...query.options, applyAutoLimit: isAvailable && state } }));
    },
    [query, setQuery, isAvailable]
  );

  return [isAvailable, isChecked, setAutoLimit];
}
