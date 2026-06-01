import React, { useMemo } from "react";
import cx from "classnames";

import { validateColor, getColorName } from "./utils";
import "./label.less";

type OwnProps = {
  className?: string;
  color?: string | null;
  presetColors?:
    | string[]
    | {
        [key: string]: string;
      }
    | null;
};

type Props = OwnProps & React.HTMLAttributes<HTMLSpanElement>;

export default function Label({ className, color = "#FFFFFF", presetColors = null, ...props }: Props) {
  const name = useMemo(() => getColorName(validateColor(color), presetColors), [color, presetColors]);

  return (
    <span className={cx("color-label", className)} {...props}>
      {name}
    </span>
  );
}
