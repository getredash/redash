import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import moment from "moment";
import { includes, isArray, isObject } from "lodash";
import { isDynamicDateRange, getDynamicDateRangeFromString } from "@/services/parameters/DateRangeParameter";
import DateRangeInput from "@/components/DateRangeInput";
import DateTimeRangeInput from "@/components/DateTimeRangeInput";
import DynamicButton from "@/components/dynamic-parameters/DynamicButton";

import "./DynamicParameters.less";

const DYNAMIC_DATE_OPTIONS = [
  {
    name: "This week",
    value: getDynamicDateRangeFromString("d_this_week"),
    label: () =>
      getDynamicDateRangeFromString("d_this_week")
        .value()[0]
        .format("MMM D") +
      " - " +
      getDynamicDateRangeFromString("d_this_week")
        .value()[1]
        .format("MMM D"),
  },
  {
    name: "This month",
    value: getDynamicDateRangeFromString("d_this_month"),
    label: () =>
      getDynamicDateRangeFromString("d_this_month")
        .value()[0]
        .format("MMMM"),
  },
  {
    name: "This year",
    value: getDynamicDateRangeFromString("d_this_year"),
    label: () =>
      getDynamicDateRangeFromString("d_this_year")
        .value()[0]
        .format("YYYY"),
  },
  {
    name: "Last week",
    value: getDynamicDateRangeFromString("d_last_week"),
    label: () =>
      getDynamicDateRangeFromString("d_last_week")
        .value()[0]
        .format("MMM D") +
      " - " +
      getDynamicDateRangeFromString("d_last_week")
        .value()[1]
        .format("MMM D"),
  },
  {
    name: "Last month",
    value: getDynamicDateRangeFromString("d_last_month"),
    label: () =>
      getDynamicDateRangeFromString("d_last_month")
        .value()[0]
        .format("MMMM"),
  },
  {
    name: "Last year",
    value: getDynamicDateRangeFromString("d_last_year"),
    label: () =>
      getDynamicDateRangeFromString("d_last_year")
        .value()[0]
        .format("YYYY"),
  },
  {
    name: "Last 7 days",
    value: getDynamicDateRangeFromString("d_last_7_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_7_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 14 days",
    value: getDynamicDateRangeFromString("d_last_14_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_14_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 30 days",
    value: getDynamicDateRangeFromString("d_last_30_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_30_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 60 days",
    value: getDynamicDateRangeFromString("d_last_60_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_60_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 90 days",
    value: getDynamicDateRangeFromString("d_last_90_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_90_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
];

const DYNAMIC_DATETIME_OPTIONS = [
  {
    name: "Today",
    value: getDynamicDateRangeFromString("d_today"),
    label: () =>
      getDynamicDateRangeFromString("d_today")
        .value()[0]
        .format("MMM D"),
  },
  {
    name: "Yesterday",
    value: getDynamicDateRangeFromString("d_yesterday"),
    label: () =>
      getDynamicDateRangeFromString("d_yesterday")
        .value()[0]
        .format("MMM D"),
  },
  ...DYNAMIC_DATE_OPTIONS,
];

const widthByType = {
  "date-range": 294,
  "datetime-range": 352,
  "datetime-range-with-seconds": 382,
};

function isValidDateRangeValue(value) {
  return isArray(value) && value.length === 2 && moment.isMoment(value[0]) && moment.isMoment(value[1]);
}

class DateRangeParameter extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    className: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    onSelect: PropTypes.func,
  };

  static defaultProps = {
    type: "",
    className: "",
    value: null,
    parameter: null,
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
    const { type, value, onSelect, className } = this.props;
    const isDateTimeRange = includes(type, "datetime-range");
    const hasDynamicValue = isDynamicDateRange(value);
    const options = isDateTimeRange ? DYNAMIC_DATETIME_OPTIONS : DYNAMIC_DATE_OPTIONS;

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
      <DateRangeComponent
        ref={this.dateRangeComponentRef}
        className={classNames("redash-datepicker date-range-input", { "dynamic-value": hasDynamicValue }, className)}
        onSelect={onSelect}
        style={{ width: hasDynamicValue ? 195 : widthByType[type] }}
        suffixIcon={
          <DynamicButton
            options={options}
            selectedDynamicValue={hasDynamicValue ? value : null}
            enabled={hasDynamicValue}
            onSelect={this.onDynamicValueSelect}
          />
        }
        {...additionalAttributes}
      />
    );
  }
}

export default DateRangeParameter;
