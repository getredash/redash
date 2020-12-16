import { map } from "lodash";
import { useCallback } from "react";
import EditParameterSettingsDialog from "@/components/EditParameterSettingsDialog";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

export default function useAddNewParameterDialog(query, onParameterAdded) {
  const handleParameterAdded = useImmutableCallback(onParameterAdded);

  return useCallback(() => {
    EditParameterSettingsDialog.showModal({
      parameter: {
        title: null,
        name: "",
        type: "text",
        value: null,
      },
      existingParams: map(query.getParameters().get(), p => p.name),
    }).onClose(param => {
      const newQuery = query.clone();
      param = newQuery.getParameters().add(param);
      handleParameterAdded(newQuery, param);
    });
  }, [query, handleParameterAdded]);
}
