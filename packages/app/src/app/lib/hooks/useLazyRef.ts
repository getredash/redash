import { useRef } from "react";

export function useLazyRef<T>(getInitialValue: () => T) {
  const lazyRef = useRef<T>(null) as React.MutableRefObject<T>;

  if (lazyRef.current === null) {
    lazyRef.current = getInitialValue();
  }

  return lazyRef;
}
