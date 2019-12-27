import { isFunction, map } from "lodash";
import { useCallback, useRef } from "react";
import EditParameterSettingsDialog from "@/components/EditParameterSettingsDialog";

export default function useAddNewParameterDialog(query, onParameterAdded) {
  const onParameterAddedRef = useRef();
  onParameterAddedRef.current = isFunction(onParameterAdded) ? onParameterAdded : () => {};

  return useCallback(() => {
    EditParameterSettingsDialog.showModal({
      parameter: {
        title: null,
        name: "",
        type: "text",
        value: null,
      },
      existingParams: map(query.getParameters().get(), p => p.name),
    }).result.then(param => {
      const newQuery = query.clone();
      param = newQuery.getParameters().add(param);
      onParameterAddedRef.current(newQuery, param);
    });
  }, [query]);
}
