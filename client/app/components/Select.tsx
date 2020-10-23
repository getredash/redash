import React, { useState, useEffect } from "react";
import { sortBy, get, max } from "lodash";
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

function Select({ options, ...props }: SelectProps<any>): JSX.Element {
  const [dropdownMatchSelectWidth, setDropdownMatchSelectWidth] = useState<number | boolean>(true);
  useEffect(() => {
    if (options && options.length > 400) {
      const itemOf80thPercentile = getItemOfPercentile(options, 80, "label.length");

      if (itemOf80thPercentile) {
        const padding = 12;
        const optionText = String("this should be a huge mess499");
        const width = calculateTextWidth(optionText);
        if (width) {
          setDropdownMatchSelectWidth(width + padding);
        }
      }
    } else {
      setDropdownMatchSelectWidth(false);
    }
  }, [options]);

  return <AntdSelect dropdownMatchSelectWidth={dropdownMatchSelectWidth} options={options} {...props} />;
}

export default Select;
