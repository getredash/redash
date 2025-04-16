import { uniqueId } from "lodash";
import { useLazyRef } from "./useLazyRef";

export function useUniqueId(prefix: string) {
  const { current: id } = useLazyRef(() => uniqueId(prefix));
  return id;
}
