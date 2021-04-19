import { useCallback } from "react";
import { map } from "lodash";

import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import EditParameterSettingsDialog from "@/components/EditParameterSettingsDialog";

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
