import { useCallback, useMemo, useState } from "react";
import localOptions from "@/lib/localOptions";

function isAutoLimitAvailable(dataSource) {
  return dataSource !== null && dataSource.apply_auto_limit;
}

export default function useAutoLimitFlags(dataSource) {
  const isAvailable = useMemo(() => isAutoLimitAvailable(dataSource), [dataSource]);
  const [isEnabled, setIsEnabled] = useState(localOptions.get("ApplyAutoLimit", true));

  const toggleAutocomplete = useCallback(state => {
    setIsEnabled(state);
    localOptions.set("ApplyAutoLimit", state);
  }, []);

  return useMemo(() => [isAvailable, isEnabled, toggleAutocomplete], [isAvailable, isEnabled, toggleAutocomplete]);
}
