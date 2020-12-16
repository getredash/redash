import React from "react";
import PropTypes from "prop-types";
import DatePicker from "antd/lib/date-picker";
import { clientConfig } from "@/services/auth";
import { Moment } from "@/components/proptypes";

const DateInput = React.forwardRef(({ defaultValue, value, onSelect, className, ...props }, ref) => {
  const format = clientConfig.dateFormat || "YYYY-MM-DD";
  const additionalAttributes = {};
  if (defaultValue && defaultValue.isValid()) {
    additionalAttributes.defaultValue = defaultValue;
  }
  if (value === null || (value && value.isValid())) {
    additionalAttributes.value = value;
  }
  return (
    <DatePicker
      ref={ref}
      className={className}
      {...additionalAttributes}
      format={format}
      placeholder="Select Date"
      onChange={onSelect}
      {...props}
    />
  );
});

DateInput.propTypes = {
  defaultValue: Moment,
  value: Moment,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

DateInput.defaultProps = {
  defaultValue: null,
  value: undefined,
  onSelect: () => {},
  className: "",
};

export default DateInput;
