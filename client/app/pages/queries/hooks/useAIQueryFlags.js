import { extend, get } from "lodash";
import { useCallback, useState } from "react";

function isAiQueryAvailable(dataSource, settings) {
  return settings.ai_enabled && get(dataSource, "supports_ai_query", false);
}

export default function useAIQueryFlags(dataSource, query, setQuery, settings) {
  const isAvailable = isAiQueryAvailable(dataSource, settings);
  const [isChecked, setIsChecked] = useState(isAvailable && query.options.apply_ai_query);
  query.options.apply_ai_query = isChecked;

  const setAiQuery = useCallback(
    (state) => {
      setIsChecked(state);
      setQuery(extend(query.clone(), { options: { ...query.options, apply_ai_query: state } }));
    },
    [query, setQuery]
  );

  return [isAvailable, isChecked, setAiQuery];
}
