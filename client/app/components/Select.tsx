import React, { useMemo } from "react";
import { maxBy } from "lodash";
import AntdSelect, { SelectProps, LabeledValue } from "antd/lib/select";
import { calculateTextWidth } from "@/lib/calculateTextWidth";

interface VirtualScrollLabeledValue extends LabeledValue {
  label: string;
}

interface VirtualScrollSelectProps extends SelectProps<any> {
  options: Array<VirtualScrollLabeledValue>;
}
function SelectWithVirtualScroll({ options, ...props }: VirtualScrollSelectProps): JSX.Element {
  const dropdownMatchSelectWidth = useMemo<number | boolean>(() => {
    if (options && options.length > 400) {
      const largestOpt = maxBy(options, "label.length");

      if (largestOpt) {
        const offset = 40;
        const optionText = largestOpt.label;
        const width = calculateTextWidth(optionText);
        if (width) {
          return width + offset;
        }
      }

      return true;
    }

    return false;
  }, [options]);

  return <AntdSelect dropdownMatchSelectWidth={dropdownMatchSelectWidth} options={options} {...props} />;
}

export default SelectWithVirtualScroll;
