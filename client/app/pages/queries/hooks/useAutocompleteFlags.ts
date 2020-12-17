import { useCallback, useMemo, useState } from "react";
import { reduce } from "lodash";
import localOptions from "@/lib/localOptions";

function calculateTokensCount(schema: any) {
  return reduce(schema, (totalLength, table) => totalLength + table.columns.length, 0);
}

export default function useAutocompleteFlags(schema: any) {
  const isAvailable = useMemo(() => calculateTokensCount(schema) <= 5000, [schema]);
  // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'true' is not assignable to param... Remove this comment to see the full error message
  const [isEnabled, setIsEnabled] = useState(localOptions.get("liveAutocomplete", true));

  const toggleAutocomplete = useCallback(state => {
    setIsEnabled(state);
    localOptions.set("liveAutocomplete", state);
  }, []);

  return useMemo(() => [isAvailable, isEnabled, toggleAutocomplete], [isAvailable, isEnabled, toggleAutocomplete]);
}
