import React, { useMemo } from "react";
import cx from "classnames";

import { validateColor, getColorName } from "./utils";
import "./label.less";

type OwnProps = {
    className?: string;
    color?: string;
    presetColors?: string[] | {
        [key: string]: string;
    };
};

type Props = OwnProps & typeof Label.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Label({ className, color, presetColors, ...props }: Props) {
  const name = useMemo(() => getColorName(validateColor(color), presetColors), [color, presetColors]);

  return (
    <span className={cx("color-label", className)} {...props}>
      {name}
    </span>
  );
}

Label.defaultProps = {
  className: null,
  color: "#FFFFFF",
  presetColors: null,
};
