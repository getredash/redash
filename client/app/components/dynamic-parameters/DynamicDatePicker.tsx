import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import moment from "moment";
import { includes } from "lodash";
import { isDynamicDate } from "@/services/parameters/DateParameter";
import DateInput from "@/components/DateInput";
import DateTimeInput from "@/components/DateTimeInput";
import DynamicButton from "@/components/dynamic-parameters/DynamicButton";

import "./DynamicParameters.less";

class DynamicDatePicker extends React.Component {
  static propTypes = {
    type: PropTypes.string,
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
    dateOptions: PropTypes.any, // eslint-disable-line react/forbid-prop-types
  };

  static defaultProps = {
    type: "",
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
    const { type, value, className, dateOptions, dynamicButtonOptions, onSelect } = this.props;
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
      <div className={classNames("date-parameter", className)}>
        <DateComponent
          {...dateOptions}
          ref={this.dateComponentRef}
          className={classNames("redash-datepicker", type, { "dynamic-value": hasDynamicValue })}
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

export default DynamicDatePicker;
