import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import moment from "moment";
import { includes } from "lodash";
import { isDynamicDate, getDynamicDateFromString } from "@/services/parameters/DateParameter";
import DateInput from "@/components/DateInput";
import DateTimeInput from "@/components/DateTimeInput";
import DynamicButton from "@/components/dynamic-parameters/DynamicButton";

import "./DynamicParameters.less";

const DYNAMIC_DATE_OPTIONS = [
  {
    name: "Today/Now",
    value: getDynamicDateFromString("d_now"),
    label: () =>
      getDynamicDateFromString("d_now")
        .value()
        .format("MMM D"),
  },
  {
    name: "Yesterday",
    value: getDynamicDateFromString("d_yesterday"),
    label: () =>
      getDynamicDateFromString("d_yesterday")
        .value()
        .format("MMM D"),
  },
];

class DateParameter extends React.Component {
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
    this.dateComponentRef = React.createRef();
  }

  onDynamicValueSelect = dynamicValue => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue === "static") {
      const parameterValue = parameter.getExecutionValue();
      if (parameterValue) {
        onSelect(moment(parameterValue));
      } else {
        onSelect(null);
      }
    } else {
      onSelect(dynamicValue.value);
    }
    // give focus to the DatePicker to get keyboard shortcuts to work
    this.dateComponentRef.current.focus();
  };

  render() {
    const { type, value, className, onSelect } = this.props;
    const hasDynamicValue = isDynamicDate(value);
    const isDateTime = includes(type, "datetime");

    const additionalAttributes = {};

    let DateComponent = DateInput;
    if (isDateTime) {
      DateComponent = DateTimeInput;
      if (includes(type, "with-seconds")) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (moment.isMoment(value) || value === null) {
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      const dynamicDate = value;
      additionalAttributes.placeholder = dynamicDate && dynamicDate.name;
      additionalAttributes.value = null;
    }

    return (
      <DateComponent
        ref={this.dateComponentRef}
        className={classNames("redash-datepicker", { "dynamic-value": hasDynamicValue }, className)}
        onSelect={onSelect}
        suffixIcon={
          <DynamicButton
            options={DYNAMIC_DATE_OPTIONS}
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

export default DateParameter;
