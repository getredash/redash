import { useCallback, useEffect, useRef, useState } from "react";

const MAX_PENDING = 100;

/**
 * Local state of an input whose `value` prop follows the input's own changes with a delay (e.g. a debounced
 * `onChange`). An older typed value coming back through the prop doesn't overwrite what was typed since; any other
 * new value (changed from outside) replaces the local one.
 *
 * Returns `[currentValue, setTypedValue]`; call `setTypedValue` with each value typed into the input.
 */
export default function useTypedValue(value) {
  const [currentValue, setCurrentValue] = useState(value);
  // Typed values that `value` hasn't caught up with yet
  const pending = useRef([]);

  useEffect(() => {
    const index = pending.current.lastIndexOf(value);
    if (index >= 0) {
      pending.current = pending.current.slice(index + 1);
      return;
    }
    pending.current = [];
    setCurrentValue(value);
  }, [value]);

  const setTypedValue = useCallback((newValue) => {
    pending.current = [...pending.current.slice(1 - MAX_PENDING), newValue];
    setCurrentValue(newValue);
  }, []);

  return [currentValue, setTypedValue];
}
