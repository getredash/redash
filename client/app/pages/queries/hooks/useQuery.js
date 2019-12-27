import { useCallback, useState, useMemo } from "react";
import { updateQuery } from "../utils";
import navigateTo from "@/services/navigateTo";

export default function useQuery(originalQuery) {
  const [query, setQuery] = useState(originalQuery);
  const [originalQuerySource, setOriginalQuerySource] = useState(originalQuery.query);

  const saveQuery = useCallback(() => {
    updateQuery(query).then(updatedQuery => {
      setQuery(updatedQuery);
      setOriginalQuerySource(updatedQuery.query);
      if (updatedQuery.id !== query.id) {
        navigateTo(updatedQuery.getSourceLink());
      }
    });
  }, [query]);

  return useMemo(
    () => ({
      query,
      setQuery,
      isDirty: query.query !== originalQuerySource,
      saveQuery,
    }),
    [query, originalQuerySource, saveQuery]
  );
}
