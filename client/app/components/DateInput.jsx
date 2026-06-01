import React from "react";
import PropTypes from "prop-types";
import DatePicker from "antd/lib/date-picker";
import { clientConfig } from "@/services/auth";
import { Moment } from "@/components/proptypes";
import { toMoment } from "@/lib/dateTimeUtils";

const DateInput = React.forwardRef(
  ({ defaultValue = null, value = undefined, onSelect = () => {}, className = "", ...props }, ref) => {
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
        onChange={(nextValue) => onSelect(toMoment(nextValue))}
        {...props}
      />
    );
  }
);

DateInput.propTypes = {
  defaultValue: Moment,
  value: Moment,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

export default DateInput;
