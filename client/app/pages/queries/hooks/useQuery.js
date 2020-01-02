import { useState, useMemo, useEffect } from "react";
import useUpdateQuery from "./useUpdateQuery";
import navigateTo from "@/services/navigateTo";

export default function useQuery(originalQuery) {
  const [query, setQuery] = useState(originalQuery);
  const [originalQuerySource, setOriginalQuerySource] = useState(originalQuery.query);

  // Editor may change query text very frequently, so use separate state variable
  // to reduce amount of component updates
  const [querySource, setQuerySource] = useState(originalQuery.query);

  const updateQuery = useUpdateQuery(query, updatedQuery => {
    // It's important to update URL first, and only then update state
    if (updatedQuery.id !== query.id) {
      // Don't reload page when saving new query
      navigateTo(updatedQuery.getSourceLink(), true, false);
    }
    setQuery(updatedQuery);
    setOriginalQuerySource(updatedQuery.query);
  });

  useEffect(() => {
    setQuerySource(query.query);
  }, [query]);

  return useMemo(
    () => ({
      query,
      setQuery,
      querySource,
      setQuerySource: source => {
        // order is important: mutate before state update; state change will immediately
        // re-render components, so query object should be in sync with state
        query.query = source;
        setQuerySource(source);
      },
      isDirty: query.query !== originalQuerySource,
      saveQuery: () => updateQuery(),
    }),
    [query, querySource, originalQuerySource, updateQuery]
  );
}
