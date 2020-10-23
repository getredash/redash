import React, { useState, useEffect } from "react";
import { maxBy } from "lodash";
import AntdSelect, { SelectProps } from "antd/lib/select";
import { calculateTextWidth } from "@/lib/calculateTextWidth";

function Select({ options, ...props }: SelectProps<any>): JSX.Element {
  const [dropdownMatchSelectWidth, setDropdownMatchSelectWidth] = useState<number | boolean>(true);
  useEffect(() => {
    if (options && options.length > 400) {
      const largestOpt = maxBy(options, "label.length");

      if (largestOpt) {
        const offset = 40;
        const optionText = String(largestOpt.label);
        const width = calculateTextWidth(optionText);
        if (width) {
          setDropdownMatchSelectWidth(width + offset);
        }
      }
    } else {
      setDropdownMatchSelectWidth(false);
    }
  }, [options]);

  return <AntdSelect dropdownMatchSelectWidth={dropdownMatchSelectWidth} options={options} {...props} />;
}

export default Select;
