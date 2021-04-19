import { useCallback } from "react";

import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import ApiKeyDialog from "@/components/queries/ApiKeyDialog";

export default function useApiKeyDialog(query, onChange) {
  const handleChange = useImmutableCallback(onChange);

  return useCallback(() => {
    ApiKeyDialog.showModal({ query }).onClose(handleChange);
  }, [query, handleChange]);
}
