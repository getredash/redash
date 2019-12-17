import { useState } from "react";

export default function useForceUpdate() {
  const [, setValue] = useState(false);
  return () => setValue(value => !value);
}
