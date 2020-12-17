import { useCallback } from "react";
import useUpdateQuery from "./useUpdateQuery";
import recordEvent from "@/services/recordEvent";
import { clientConfig } from "@/services/auth";
export default function useRenameQuery(query: any, onChange: any) {
    const updateQuery = useUpdateQuery(query, onChange);
    return useCallback(name => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("edit_name", "query", query.id);
        const changes = { name };
        const options = {};
        if (query.is_draft && (clientConfig as any).autoPublishNamedQueries && name !== "New Query") {
            (changes as any).is_draft = false;
            (options as any).successMessage = "Query saved and published";
        }
        updateQuery(changes, options);
    }, [query.id, query.is_draft, updateQuery]);
}
