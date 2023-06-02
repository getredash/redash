import React, { useCallback, useMemo } from "react";
import { maxBy } from "lodash";
import AntdSelect, { SelectProps, LabeledValue } from "antd/lib/select";
import { calculateTextWidth } from "@/lib/calculateTextWidth";
import Button from "antd/lib/button";

const MIN_LEN_FOR_VIRTUAL_SCROLL = 400;

interface VirtualScrollLabeledValue extends LabeledValue {
  label: string;
}

interface VirtualScrollSelectProps extends Omit<SelectProps<string>, "optionFilterProp" | "children"> {
  options: Array<VirtualScrollLabeledValue>;
}
function SelectWithVirtualScroll({ options, value, onChange, ...props }: VirtualScrollSelectProps): JSX.Element {
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

  const handleSelectAll = useCallback(() => {
    onChange?.(
      options.map((option) => option.value),
      options
    );
  }, [onChange, options]);

  const handleUnselectAll = useCallback(() => {
    onChange?.([], []);
  }, [onChange]);

  const enhancedOptions = useMemo(() => {
    return [
      {
        label: !value?.length ? (
          <Button type="link" onClick={() => handleSelectAll()}>
            Select All
          </Button>
        ) : (
          <Button type="link" onClick={() => handleUnselectAll()}>
            Unselect All
          </Button>
        ),
        options,
      },
    ];
  }, [handleSelectAll, handleUnselectAll, options, value?.length]);

  return (
    <AntdSelect<string>
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      options={enhancedOptions}
      allowClear={true}
      optionFilterProp="label" // as this component expects "options" prop
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}

export default SelectWithVirtualScroll;
