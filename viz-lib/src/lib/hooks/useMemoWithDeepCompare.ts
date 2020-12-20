import { isEqual } from "lodash";
import { useMemo, useRef } from "react";

export default function useMemoWithDeepCompare(create: any, inputs: any) {
  const valueRef = useRef();
  const value = useMemo(create, inputs);
  if (!isEqual(value, valueRef.current)) {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'unknown' is not assignable to type 'undefine... Remove this comment to see the full error message
    valueRef.current = value;
  }
  return valueRef.current;
}
