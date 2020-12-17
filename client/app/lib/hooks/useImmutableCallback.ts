import { isFunction, noop } from "lodash";
import { useRef, useCallback } from "react";

// This hook wraps a potentially changeable function object and always returns the same
// function so it's safe to use it with other hooks: wrapper function stays the same,
// but will always call a latest wrapped function.
// A quick note regarding `react-hooks/exhaustive-deps`: since wrapper function doesn't
// change, it's safe to use it as a dependency, it will never trigger other hooks.
export default function useImmutableCallback(callback: any) {
  const callbackRef = useRef();
  // @ts-expect-error ts-migrate(2322) FIXME: Type '(...args: any[]) => any' is not assignable t... Remove this comment to see the full error message
  callbackRef.current = isFunction(callback) ? callback : noop;

  // @ts-expect-error ts-migrate(2722) FIXME: Cannot invoke an object which is possibly 'undefin... Remove this comment to see the full error message
  return useCallback((...args) => callbackRef.current(...args), []);
}
