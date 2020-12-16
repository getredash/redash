import { useCallback } from "react";
import ApiKeyDialog from "@/components/queries/ApiKeyDialog";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

export default function useApiKeyDialog(query, onChange) {
  const handleChange = useImmutableCallback(onChange);

  return useCallback(() => {
    ApiKeyDialog.showModal({ query }).onClose(handleChange);
  }, [query, handleChange]);
}
