import { useCallback, useMemo, useState } from "react";
import { reduce } from "lodash";
import localOptions from "@/lib/localOptions";

function calculateTokensCount(schema) {
  return reduce(schema, (totalLength, table) => totalLength + table.columns.length, 0);
}

export default function useAutocompleteFlags(schema) {
  const isAvailable = useMemo(() => calculateTokensCount(schema) <= 5000, [schema]);
  const [isEnabled, setIsEnabled] = useState(localOptions.get("liveAutocomplete", true));

  const toggleAutocomplete = useCallback(state => {
    setIsEnabled(state);
    localOptions.set("liveAutocomplete", state);
  }, []);

  return useMemo(() => [isAvailable, isEnabled, toggleAutocomplete], [isAvailable, isEnabled, toggleAutocomplete]);
}
