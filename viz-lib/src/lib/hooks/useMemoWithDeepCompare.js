import { isEqual } from "lodash";
import { useMemo, useRef } from "react";

export default function useMemoWithDeepCompare(create, inputs) {
  const valueRef = useRef();
  const value = useMemo(create, inputs);
  if (!isEqual(value, valueRef.current)) {
    valueRef.current = value;
  }
  return valueRef.current;
}
