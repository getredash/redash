import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import moment from "moment";
import { includes, isArray, isObject } from "lodash";
import { isDynamicDateRange } from "@/services/parameters/DateRangeParameter";
import DateRangeInput from "@/components/DateRangeInput";
import DateTimeRangeInput from "@/components/DateTimeRangeInput";
import DynamicButton from "@/components/dynamic-parameters/DynamicButton";

import "./DynamicParameters.less";

function isValidDateRangeValue(value) {
  return isArray(value) && value.length === 2 && moment.isMoment(value[0]) && moment.isMoment(value[1]);
}

class DynamicDateRangePicker extends React.Component {
  static propTypes = {
    type: PropTypes.oneOf(["date-range", "datetime-range", "datetime-range-with-seconds"]).isRequired,
    className: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    onSelect: PropTypes.func,
    dynamicButtonOptions: PropTypes.shape({
      staticValueLabel: PropTypes.string,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          name: PropTypes.string,
          value: PropTypes.object,
          label: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
        })
      ),
    }),
    dateRangeOptions: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    type: "date-range",
    className: "",
    value: null,
    parameter: null,
    dynamicButtonOptions: {
      options: [],
    },
    onSelect: () => {},
  };

  constructor(props) {
    super(props);
    this.dateRangeComponentRef = React.createRef();
  }

  onDynamicValueSelect = dynamicValue => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue === "static") {
      const parameterValue = parameter.getExecutionValue();
      if (isObject(parameterValue) && parameterValue.start && parameterValue.end) {
        onSelect([moment(parameterValue.start), moment(parameterValue.end)]);
      } else {
        onSelect(null);
      }
    } else {
      onSelect(dynamicValue.value);
    }
    // give focus to the DatePicker to get keyboard shortcuts to work
    this.dateRangeComponentRef.current.focus();
  };

  render() {
    const { type, value, onSelect, className, dynamicButtonOptions, dateRangeOptions, parameter, ...rest } = this.props;
    const isDateTimeRange = includes(type, "datetime-range");
    const hasDynamicValue = isDynamicDateRange(value);

    const additionalAttributes = {};

    let DateRangeComponent = DateRangeInput;
    if (isDateTimeRange) {
      DateRangeComponent = DateTimeRangeInput;
      if (includes(type, "with-seconds")) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (isValidDateRangeValue(value) || value === null) {
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      additionalAttributes.placeholder = [value && value.name];
      additionalAttributes.value = null;
    }

    return (
      <div {...rest} className={classNames("date-range-parameter", className)}>
        <DateRangeComponent
          {...dateRangeOptions}
          ref={this.dateRangeComponentRef}
          className={classNames("redash-datepicker date-range-input", type, { "dynamic-value": hasDynamicValue })}
          onSelect={onSelect}
          suffixIcon={null}
          {...additionalAttributes}
        />
        <DynamicButton
          options={dynamicButtonOptions.options}
          staticValueLabel={dynamicButtonOptions.staticValueLabel}
          selectedDynamicValue={hasDynamicValue ? value : null}
          enabled={hasDynamicValue}
          onSelect={this.onDynamicValueSelect}
        />
      </div>
    );
  }
}

export default DynamicDateRangePicker;
