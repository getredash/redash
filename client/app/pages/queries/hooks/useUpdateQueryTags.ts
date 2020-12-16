import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";

export default function useUpdateQueryTags(query, onChange) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(
    tags => {
      recordEvent("edit_tags", "query", query.id);
      updateQuery({ tags });
    },
    [query.id, updateQuery]
  );
}
