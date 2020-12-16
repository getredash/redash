import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";
import { clientConfig } from "@/services/auth";

export default function useRenameQuery(query: any, onChange: any) {
  const updateQuery = useUpdateQuery(query, onChange);

  return useCallback(
    name => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
      recordEvent("edit_name", "query", query.id);
      const changes = { name };
      const options = {};

      // @ts-expect-error ts-migrate(2339) FIXME: Property 'autoPublishNamedQueries' does not exist ... Remove this comment to see the full error message
      if (query.is_draft && clientConfig.autoPublishNamedQueries && name !== "New Query") {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'is_draft' does not exist on type '{ name... Remove this comment to see the full error message
        changes.is_draft = false;
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'successMessage' does not exist on type '... Remove this comment to see the full error message
        options.successMessage = "Query saved and published";
      }

      updateQuery(changes, options);
    },
    [query.id, query.is_draft, updateQuery]
  );
}
