import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";

export default function useUpdateQueryTags(query: any, onChange: any) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(
    tags => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
      recordEvent("edit_tags", "query", query.id);
      updateQuery({ tags });
    },
    [query.id, updateQuery]
  );
}
