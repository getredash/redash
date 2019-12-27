import { useState, useMemo } from "react";
import useUpdateQuery from "./useUpdateQuery";
import navigateTo from "@/services/navigateTo";

export default function useQuery(originalQuery) {
  const [query, setQuery] = useState(originalQuery);
  const [originalQuerySource, setOriginalQuerySource] = useState(originalQuery.query);

  const updateQuery = useUpdateQuery(query, updatedQuery => {
    setQuery(updatedQuery);
    setOriginalQuerySource(updatedQuery.query);
    if (updatedQuery.id !== query.id) {
      navigateTo(updatedQuery.getSourceLink());
    }
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
