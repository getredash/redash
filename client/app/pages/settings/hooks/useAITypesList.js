import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import AIService from "@/services/ai";
import recordEvent from "@/services/recordEvent";
import { get } from "lodash";
import { useEffect, useMemo, useState } from "react";

export default function useAITypesList(currentValues) {
  const [aiTypes, setAiTypes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleError = useImmutableCallback((error) => {
    console.error(error);
  });

  useEffect(() => {
    const ai_enabled = get(currentValues, "ai_enabled", false);

    if (!ai_enabled) {
      setAiTypes({});
      return;
    }

    if (isLoaded) {
      return;
    }

    recordEvent("view", "list", "ai_types_list");

    let isCancelled = false;

    setIsLoading(true);

    AIService.types()
      .then((response) => {
        if (!isCancelled) {
          setAiTypes(get(response, "types", {}));
          setIsLoading(false);
          setIsLoaded(true);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setIsLoading(false);
          handleError(error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [handleError, currentValues]); // eslint-disable-line react-hooks/exhaustive-deps

  const memoizedAiTypes = useMemo(() => aiTypes, [aiTypes]);

  return { aiTypes: memoizedAiTypes, isLoading };
}
