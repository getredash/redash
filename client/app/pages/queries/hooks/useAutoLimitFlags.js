import { useCallback, useMemo, useState } from "react";
import localOptions from "@/lib/localOptions";

function isAutoLimitAvailable(dataSource) {
  return dataSource !== null && dataSource.apply_auto_limit;
}

export default function useAutoLimitFlags(dataSource) {
  const isAvailable = useMemo(() => isAutoLimitAvailable(dataSource), [dataSource]);
  const [isChecked, setIsChecked] = useState(localOptions.get("ApplyAutoLimit", true));

  const checkboxAutoLimit = useCallback(state => {
    setIsChecked(state);
    localOptions.set("ApplyAutoLimit", state);
  }, []);

  return useMemo(() => [isAvailable, isChecked, checkboxAutoLimit], [isAvailable, isChecked, checkboxAutoLimit]);
}
