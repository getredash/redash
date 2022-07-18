import { useCallback, useState } from "react";
import localOptions from "@/lib/localOptions";
import { extend } from "lodash";

function isLongQueryAvailable(dataSource) {
  return true;
}

export default function useLongQueryFlags(dataSource, query, setQuery) {
  const isAvailable = isLongQueryAvailable(dataSource);
  const [isChecked, setIsChecked] = useState(query.options.apply_long_query);
  query.options.apply_long_query = isChecked;

  const setLongQuery = useCallback(
    state => {
      setIsChecked(state);
      localOptions.set("applyLongQuery", state);
      setQuery(extend(query.clone(), { options: {...query.options, apply_long_query: state } }));
    }, [query, setQuery]
  );

  return [isAvailable, isChecked, setLongQuery];
}