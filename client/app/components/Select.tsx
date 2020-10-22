import React, { useRef, useState, useEffect } from "react";
import { sortBy, get } from "lodash";
import AntdSelect, { SelectProps } from "antd/lib/select";

function getItemOfPercentile<T>(list: Array<T>, percentile: number, sortIteratee: string | string[] = "length") {
  if (get(list[0], sortIteratee, null) === null) {
    return;
  }
  const sortedList = sortBy(list, sortIteratee);
  const percentileIndex = Math.ceil((list.length - 1) * (percentile / 100));
  return sortedList[percentileIndex];
}

const FONT_RATIO = 0.7;

function Select({ style, options, ...props }: SelectProps<any>): JSX.Element {
  const selectEl = useRef<AntdSelect>(null);
  const [dropdownMatchSelectWidth, setDropdownMatchSelectWidth] = useState<number | boolean>(false);
  useEffect(() => {
    if (options && options.length > 1) {
      let fontSize = 10;
      if (selectEl.current) {
        console.log(selectEl.current);
        fontSize = parseFloat(getComputedStyle(document.body).fontSize);
      }
      // console.log(fontSize);
      const itemOf80thPercentile = getItemOfPercentile(options, 80, "label.length");
      if (itemOf80thPercentile) {
        const len = String(itemOf80thPercentile.label).length;
        setDropdownMatchSelectWidth(len * fontSize * FONT_RATIO);

        console.log(dropdownMatchSelectWidth);
      }
    }
  }, [dropdownMatchSelectWidth, options]);

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
