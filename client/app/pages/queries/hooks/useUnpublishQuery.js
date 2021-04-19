import { useCallback } from "react";

import recordEvent from "@/services/recordEvent";

import useUpdateQuery from "./useUpdateQuery";

export default function useUnpublishQuery(query, onChange) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(() => {
    recordEvent("toggle_published", "query", query.id);
    updateQuery({ is_draft: true });
  }, [query.id, updateQuery]);
}
