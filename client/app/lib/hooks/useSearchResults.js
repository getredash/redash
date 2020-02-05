import { useState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function useSearchResults(fetch, { initialResults = null, debounceTimeout = 200 } = {}) {
  const [result, setResult] = useState(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const currentSearchTerm = useRef(null);
  const isDestroyed = useRef(false);

  const [doSearch] = useDebouncedCallback(searchTerm => {
    setIsLoading(true);
    currentSearchTerm.current = searchTerm;
    fetch(searchTerm)
      .catch(() => null)
      .then(data => {
        if (searchTerm === currentSearchTerm.current && !isDestroyed.current) {
          setResult(data);
          setIsLoading(false);
        }
      });
  }, debounceTimeout);

  useEffect(
    () =>
      // ignore all requests after component destruction
      () => {
        isDestroyed.current = true;
      },
    []
  );

  return [doSearch, result, isLoading];
}
