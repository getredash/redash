import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export default function useSearchResults(
  fetch,
  { initialResults = null, debounceTimeout = 200 } = {},
) {
  const [result, setResult] = useState(initialResults);
  const [isLoading, setIsLoading] = useState(false);

  let currentSearchTerm = null;
  let isDestroyed = false;

  const [doSearch] = useDebouncedCallback((searchTerm) => {
    setIsLoading(true);
    currentSearchTerm = searchTerm;
    fetch(searchTerm)
      .catch(() => null)
      .then((data) => {
        if ((searchTerm === currentSearchTerm) && !isDestroyed) {
          setResult(data);
          setIsLoading(false);
        }
      });
  }, debounceTimeout);

  useEffect(() => (
    // ignore all requests after component destruction
    () => { isDestroyed = true; }
  ), []);

  return [doSearch, result, isLoading];
}
