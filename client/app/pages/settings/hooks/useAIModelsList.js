import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
import AIService from "@/services/ai";
import recordEvent from "@/services/recordEvent";
import { debounce, get } from "lodash";
import { useEffect, useState } from "react";

export default function useAIModelsList(currentValues) {
  const [modelsList, setModelsList] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useImmutableCallback((error) => {
    console.error(error);
  });

  useEffect(() => {
    const ai_enabled = get(currentValues, "ai_enabled", false);

    if (!ai_enabled) {
      setModelsList({});
      return;
    }

    const ai_type = get(currentValues, "ai_type");
    const ai_token = get(currentValues, "ai_token");
    const ai_host = get(currentValues, "ai_host");

    let isCancelled = false;

    const fetchModels = () => {
      recordEvent("view", "list", `${ai_type.replace(/_/g, "-")}_models_list`);

      setIsLoading(true);

      AIService.models({ type: ai_type, host: ai_host, token: ai_token })
        .then((response) => {
          if (!isCancelled) {
            setModelsList(get(response, "models", {}));
            setIsLoading(false);
          }
        })
        .catch((error) => {
          if (!isCancelled) {
            setIsLoading(false);
            handleError(error);
          }
        });
    };

    const debouncedFetch = debounce(fetchModels, 300);
    debouncedFetch();

    return () => {
      isCancelled = true;
      debouncedFetch.cancel();
    };
  }, [handleError, currentValues]);

  return { modelsList, isLoading, setModelsList };
}
