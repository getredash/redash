import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";

export default function useUpdateQueryDescription(query, onChange) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(
    description => {
      recordEvent("edit_description", "query", query.id);
      updateQuery({ description });
    },
    [query.id, updateQuery]
  );
}
