import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";
import { clientConfig } from "@/services/auth";

export default function useRenameQuery(query, onChange) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(
    name => {
      recordEvent("edit_name", "query", query.id);
      const changes = { name };
      const options = {};

      if (query.is_draft && clientConfig.autoPublishNamedQueries && name !== "New Query") {
        changes.is_draft = false;
        options.successMessage = "Query saved and published";
      }

      updateQuery(changes, options);
    },
    [query.id, query.is_draft, updateQuery]
  );
}
