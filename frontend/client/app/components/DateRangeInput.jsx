import { isArray } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import DatePicker from "antd/lib/date-picker";
import { clientConfig } from "@/services/auth";
import { Moment } from "@/components/proptypes";

const { RangePicker } = DatePicker;

const DateRangeInput = React.forwardRef(({ defaultValue, value, onSelect, className, ...props }, ref) => {
  const format = clientConfig.dateFormat || "YYYY-MM-DD";
  const additionalAttributes = {};
  if (isArray(defaultValue) && defaultValue[0].isValid() && defaultValue[1].isValid()) {
    additionalAttributes.defaultValue = defaultValue;
  }
  if (value === null || (isArray(value) && value[0].isValid() && value[1].isValid())) {
    additionalAttributes.value = value;
  }
  return (
    <RangePicker
      ref={ref}
      className={className}
      {...additionalAttributes}
      format={format}
      onChange={onSelect}
      {...props}
    />
  );
});

DateRangeInput.propTypes = {
  defaultValue: PropTypes.arrayOf(Moment),
  value: PropTypes.arrayOf(Moment),
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

DateRangeInput.defaultProps = {
  defaultValue: null,
  value: undefined,
  onSelect: () => {},
  className: "",
};

export default DateRangeInput;
