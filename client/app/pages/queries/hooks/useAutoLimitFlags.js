import { useCallback, useState } from "react";
import { get, extend } from "lodash";

import localOptions from "@/lib/localOptions";

function isAutoLimitAvailable(dataSource) {
  return get(dataSource, "supports_auto_limit", false);
}

export default function useAutoLimitFlags(dataSource, query, setQuery) {
  const isAvailable = isAutoLimitAvailable(dataSource);
  const [isChecked, setIsChecked] = useState(query.options.apply_auto_limit);
  query.options.apply_auto_limit = isChecked;

  const setAutoLimit = useCallback(
    state => {
      setIsChecked(state);
      localOptions.set("applyAutoLimit", state);
      setQuery(extend(query.clone(), { options: { ...query.options, apply_auto_limit: state } }));
    },
    [query, setQuery]
  );

  return [isAvailable, isChecked, setAutoLimit];
}
