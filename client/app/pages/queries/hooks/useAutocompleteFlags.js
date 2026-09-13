import { useCallback, useMemo, useState } from "react";
import localOptions from "@/lib/localOptions";

export default function useAutocompleteFlags(schema) {
  const isAvailable = true;
  const [isEnabled, setIsEnabled] = useState(localOptions.get("liveAutocomplete", true));

  const toggleAutocomplete = useCallback((state) => {
    setIsEnabled(state);
    localOptions.set("liveAutocomplete", state);
  }, []);

  return useMemo(() => [isAvailable, isEnabled, toggleAutocomplete], [isAvailable, isEnabled, toggleAutocomplete]);
}
