import { useCallback } from "react";

import recordEvent from "@/services/recordEvent";

import useUpdateQuery from "./useUpdateQuery";

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
