import { useCallback, useState, useEffect } from "react";

// useMedia hook from usehooks.com
export default function useMedia(queries, values, defaultValue) {
  // Array containing a media query list for each query
  const mediaQueryLists = queries.map(q => window.matchMedia(q));

  // Function that gets value based on matching media query
  const getValue = useCallback(() => {
    // Get index of first media query that matches
    const index = mediaQueryLists.findIndex(mql => mql.matches);
    // Return related value or defaultValue if none
    return typeof values[index] !== 'undefined' ? values[index] : defaultValue;
  }, [defaultValue, mediaQueryLists, values]);

  // State and setter for matched value
  const [value, setValue] = useState(getValue);

  useEffect(
    () => {
      // Event listener callback
      // Note: By defining getValue outside of useEffect we ensure that it has ...
      // ... current values of hook args (as this hook callback is created once on mount).
      const handler = () => setValue(getValue);
      // Set a listener for each media query with above handler as callback.
      mediaQueryLists.forEach(mql => mql.addListener(handler));
      // Remove listeners on cleanup
      return () => mediaQueryLists.forEach(mql => mql.removeListener(handler));
    },
    [getValue, mediaQueryLists] // Empty array ensures effect is only run on mount and unmount
  );

  return value;
}

export function useMediaBreakpoint() {
  return useMedia(
    ['(min-width: 1200px)', '(min-width: 992px)', '(min-width: 768px)', '(min-width: 576px)'],
    ['xl', 'lg', 'md', 'sm'],
    'xs',
  );
}
