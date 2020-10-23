import React, { useState, useEffect } from "react";
import { sortBy, get } from "lodash";
import AntdSelect, { SelectProps } from "antd/lib/select";
import { calculateTextWidth } from "@/lib/calculateTextWidth";

function getItemOfPercentile<T>(list: Array<T>, percentile: number, sortIteratee = "length") {
  if (get(list[0], sortIteratee, null) === null) {
    return;
  }
  const sortedList = sortBy(list, sortIteratee);
  const percentileIndex = Math.ceil((list.length - 1) * (percentile / 100));
  return sortedList[percentileIndex];
}

function Select({ style, options, ...props }: SelectProps<any>): JSX.Element {
  const [dropdownMatchSelectWidth, setDropdownMatchSelectWidth] = useState<number | boolean>(true);
  useEffect(() => {
    if (options && options.length > 400) {
      const itemOf80thPercentile = getItemOfPercentile(options, 80, "label.length");

      if (itemOf80thPercentile) {
        const optionText = String(itemOf80thPercentile.label);
        const width = calculateTextWidth(optionText);
        if (width) {
          setDropdownMatchSelectWidth(width);
        }
      }
    } else {
      setDropdownMatchSelectWidth(false);
    }
  }, [options]);

  return (
    <AntdSelect
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      options={options}
      style={{ minWidth: 60, ...style }}
      {...props}
    />
  );
}

export default Select;
