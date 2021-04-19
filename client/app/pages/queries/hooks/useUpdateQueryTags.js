import { useCallback } from "react";

import recordEvent from "@/services/recordEvent";

import useUpdateQuery from "./useUpdateQuery";

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
