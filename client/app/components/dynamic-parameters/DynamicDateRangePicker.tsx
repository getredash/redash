import React from "react";
import classNames from "classnames";
import moment from "moment";
import { includes, isArray, isObject } from "lodash";
import { isDynamicDateRange } from "@/services/parameters/DateRangeParameter";
import DateRangeInput from "@/components/DateRangeInput";
import DateTimeRangeInput from "@/components/DateTimeRangeInput";
import DynamicButton from "@/components/dynamic-parameters/DynamicButton";

import "./DynamicParameters.less";

function isValidDateRangeValue(value: any) {
  return isArray(value) && value.length === 2 && moment.isMoment(value[0]) && moment.isMoment(value[1]);
}

type OwnProps = {
    type: "date-range" | "datetime-range" | "datetime-range-with-seconds";
    className?: string;
    value?: any;
    parameter?: any;
    onSelect?: (...args: any[]) => any;
    dynamicButtonOptions?: {
        staticValueLabel?: string;
        options?: {
            name?: string;
            value?: any;
            label?: string | ((...args: any[]) => any);
        }[];
    };
    dateRangeOptions?: any;
};

type Props = OwnProps & typeof DynamicDateRangePicker.defaultProps;

class DynamicDateRangePicker extends React.Component<Props> {
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

  dateRangeComponentRef: any;

  constructor(props: Props) {
    super(props);
    this.dateRangeComponentRef = React.createRef();
  }

  onDynamicValueSelect = (dynamicValue: any) => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue === "static") {
      const parameterValue = parameter.getExecutionValue();
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'start' does not exist on type 'object'.
      if (isObject(parameterValue) && parameterValue.start && parameterValue.end) {
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'start' does not exist on type 'object'.
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
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'withSeconds' does not exist on type '{}'... Remove this comment to see the full error message
        additionalAttributes.withSeconds = true;
      }
    }

    if (isValidDateRangeValue(value) || value === null) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type '{}'.
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'placeholder' does not exist on type '{}'... Remove this comment to see the full error message
      additionalAttributes.placeholder = [value && value.name];
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type '{}'.
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
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(dynamicValue: any) => void' is not assignab... Remove this comment to see the full error message
          onSelect={this.onDynamicValueSelect}
        />
      </div>
    );
  }
}

export default DynamicDateRangePicker;
