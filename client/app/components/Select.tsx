import React, { useRef, useState, useEffect } from "react";
import { sortBy, map } from "lodash";
import AntdSelect, { SelectProps } from "antd/lib/select";

function getItemOfPercentile<T>(list: Array<T>, percentile: number, sortIteratee: string | string[] = "length") {
  const sortedList = sortBy(list, sortIteratee);
  const percentileIndex = Math.ceil((list.length - 1) * (percentile / 100));

  return sortedList[percentileIndex];
}

function Select({ style, options, ...props }: SelectProps<any>): JSX.Element {
  const selectEl = useRef<AntdSelect>(null);
  const [dropdownMatchSelectWidth, setDropdownMatchSelectWidth] = useState<number | boolean>(false);
  useEffect(() => {
    if (options && options.length > 500) {
      let fontSize = 10;
      if (selectEl.current) {
        fontSize = parseFloat(getComputedStyle((selectEl.current as unknown) as Element).fontSize);
      }
      const width = String(getItemOfPercentile(options, 80, "label.length").label).length;
      setDropdownMatchSelectWidth(width);
    }
  }, [options]);

  return (
    <AntdSelect
      ref={selectEl}
      dropdownMatchSelectWidth={dropdownMatchSelectWidth}
      options={options}
      style={{ minWidth: 60, ...style }}
      {...props}
    />
  );
}

export default Select;
