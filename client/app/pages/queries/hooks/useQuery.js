import { useState, useMemo } from "react";
import useUpdateQuery from "./useUpdateQuery";
import navigateTo from "@/services/navigateTo";

export default function useQuery(originalQuery) {
  const [query, setQuery] = useState(originalQuery);
  const [originalQuerySource, setOriginalQuerySource] = useState(originalQuery.query);

  const updateQuery = useUpdateQuery(query, updatedQuery => {
    // It's important to update URL first, and only then update state
    if (updatedQuery.id !== query.id) {
      // Don't reload page when saving new query
      navigateTo(updatedQuery.getSourceLink(), true, false);
    }
    setQuery(updatedQuery);
    setOriginalQuerySource(updatedQuery.query);
  });

  return useMemo(
    () => ({
      query,
      setQuery,
      isDirty: query.query !== originalQuerySource,
      saveQuery: () => updateQuery(),
    }),
    [query, originalQuerySource, updateQuery]
  );
}
