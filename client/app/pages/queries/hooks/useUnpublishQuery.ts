import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";

export default function useUnpublishQuery(query: any, onChange: any) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
    recordEvent("toggle_published", "query", query.id);
    updateQuery({ is_draft: true });
  }, [query.id, updateQuery]);
}
