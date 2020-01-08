import { isFunction } from "lodash";
import { useRef, useCallback } from "react";
import ApiKeyDialog from "@/components/queries/ApiKeyDialog";

export default function useApiKeyDialog(query, onChange) {
  const onChangeRef = useRef();
  onChangeRef.current = isFunction(onChange) ? onChange : () => {};

  return useCallback(() => {
    ApiKeyDialog.showModal({ query }).result.then(updatedQuery => {
      onChangeRef.current(updatedQuery);
    });
  }, [query]);
}
