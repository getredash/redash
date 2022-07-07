import { isEmpty } from "lodash";
import { useState, useMemo } from "react";
import useUpdateQuery from "./useUpdateQuery";
import navigateTo from "@/components/ApplicationArea/navigateTo";

export default function useQuery(originalQuery) {
  const [query, setQuery] = useState(originalQuery);
  const [originalQuerySource, setOriginalQuerySource] = useState(originalQuery.query);
  const [originalAutoLimit, setOriginalAutoLimit] = useState(query.options.apply_auto_limit);
  const [originalLongQuery, setOriginalLongQuery] = useState(query.options.apply_long_query);

  const updateQuery = useUpdateQuery(query, updatedQuery => {
    // It's important to update URL first, and only then update state
    if (updatedQuery.id !== query.id) {
      // Don't reload page when saving new query
      navigateTo(updatedQuery.getUrl(true), true);
    }
    setQuery(updatedQuery);
    setOriginalQuerySource(updatedQuery.query);
    setOriginalAutoLimit(updatedQuery.options.apply_auto_limit);
    setOriginalLongQuery(updatedQuery.options.apply_long_query);
  });

  return useMemo(
    () => ({
      query,
      setQuery,
      isDirty:
        query.query !== originalQuerySource ||
        (
          !isEmpty(query.query) &&
          query.options.apply_auto_limit !== originalAutoLimit
        ) || 
        (
          !isEmpty(query.query) &&
          query.options.apply_long_query !== originalLongQuery
        )
        ,
      saveQuery: () => updateQuery(),
    }),
    [query, originalQuerySource, updateQuery, originalAutoLimit, originalLongQuery]
  );
}
