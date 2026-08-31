import AIAlertsDialog from "@/components/queries/AIAlertsDialog";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import { useCallback } from "react";

export default function useAIAlertsDialog(query, onChange) {
  const handleChange = useImmutableCallback(onChange);

  return useCallback(() => {
    AIAlertsDialog.showModal({ query }).onClose(handleChange);
  }, [query, handleChange]);
}
