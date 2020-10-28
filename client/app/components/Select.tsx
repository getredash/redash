import React, { useMemo } from "react";
import { maxBy } from "lodash";
import AntdSelect, { SelectProps } from "antd/lib/select";
import { calculateTextWidth } from "@/lib/calculateTextWidth";

function SelectWithVirtualScroll({ options, ...props }: SelectProps<any>): JSX.Element {
  const dropdownMatchSelectWidth = useMemo<number | boolean>(() => {
    if (options && options.length > 400) {
      const largestOpt = maxBy(options, "label.length");

      if (largestOpt) {
        const offset = 40;
        const optionText = String(largestOpt.label);
        const width = calculateTextWidth(optionText);
        if (width) {
          return width + offset;
        }
      }

      return true;
    } else {
      return false;
    }
  }, [options]);

  return <AntdSelect dropdownMatchSelectWidth={dropdownMatchSelectWidth} options={options} {...props} />;
}

export default SelectWithVirtualScroll;
