import React, { useMemo } from "react";
import { maxBy } from "lodash";
import AntdSelect, { SelectProps, LabeledValue } from "antd/lib/select";
import { calculateTextWidth } from "@/lib/calculateTextWidth";

const MIN_LEN_FOR_VIRTUAL_SCROLL = 400;

interface VirtualScrollLabeledValue extends LabeledValue {
  label: string;
}

interface VirtualScrollSelectProps extends Omit<SelectProps<string>, "optionFilterProp" | "children"> {
  options: Array<VirtualScrollLabeledValue>;
}
function SelectWithVirtualScroll({ options, ...props }: VirtualScrollSelectProps): JSX.Element {
  const dropdownMatchSelectWidth = useMemo<number | boolean>(() => {
    if (options && options.length > MIN_LEN_FOR_VIRTUAL_SCROLL) {
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

  return (
    <AntdSelect<string>
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      options={options}
      allowClear={true}
      optionFilterProp="label" // as this component expects "options" prop
      {...props}
    />
  );
}

export default SelectWithVirtualScroll;
