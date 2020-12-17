import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";

export default function useUpdateQueryDescription(query: any, onChange: any) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(
    description => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
      recordEvent("edit_description", "query", query.id);
      updateQuery({ description });
    },
    [query.id, updateQuery]
  );
}
