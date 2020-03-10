import { isArray } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import DatePicker from "antd/lib/date-picker";
import { clientConfig } from "@/services/auth";
import { Moment } from "@/components/proptypes";

const { RangePicker } = DatePicker;

const DateTimeRangeInput = React.forwardRef(
  ({ defaultValue, value, withSeconds, onSelect, className, ...props }, ref) => {
    const format = (clientConfig.dateFormat || "YYYY-MM-DD") + (withSeconds ? " HH:mm:ss" : " HH:mm");
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
        showTime
        {...additionalAttributes}
        format={format}
        onChange={onSelect}
        {...props}
      />
    );
  }
);

DateTimeRangeInput.propTypes = {
  defaultValue: PropTypes.arrayOf(Moment),
  value: PropTypes.arrayOf(Moment),
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

DateTimeRangeInput.defaultProps = {
  defaultValue: null,
  value: undefined,
  withSeconds: false,
  onSelect: () => {},
  className: "",
};

export default DateTimeRangeInput;
