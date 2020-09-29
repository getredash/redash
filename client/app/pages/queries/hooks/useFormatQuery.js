import { extend, get } from "lodash";
import { useCallback } from "react";
import { Query } from "@/services/query";
import notification from "@/services/notification";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

export default function useFormatQuery(query, syntax, onChange) {
  const handleChange = useImmutableCallback(onChange);

  return useCallback(() => {
    Query.format(syntax || "sql", query.query)
      .then(queryText => {
        handleChange(extend(query.clone(), { query: queryText }));
      })
      .catch(error =>
        notification.error(get(error, "response.data.message", "Failed to format query: unknown error."))
      );
  }, [query, syntax, handleChange]);
}
