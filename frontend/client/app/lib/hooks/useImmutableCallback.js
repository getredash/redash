import { isFunction, noop } from "lodash";
import { useRef, useCallback } from "react";

// This hook wraps a potentially changeable function object and always returns the same
// function so it's safe to use it with other hooks: wrapper function stays the same,
// but will always call a latest wrapped function.
// A quick note regarding `react-hooks/exhaustive-deps`: since wrapper function doesn't
// change, it's safe to use it as a dependency, it will never trigger other hooks.
export default function useImmutableCallback(callback) {
  const callbackRef = useRef();
  callbackRef.current = isFunction(callback) ? callback : noop;

  return useCallback((...args) => callbackRef.current(...args), []);
}
