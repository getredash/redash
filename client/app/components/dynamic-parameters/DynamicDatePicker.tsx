import React from "react";
import classNames from "classnames";
import moment from "moment";
import { includes } from "lodash";
import { isDynamicDate } from "@/services/parameters/DateParameter";
import DateInput from "@/components/DateInput";
import DateTimeInput from "@/components/DateTimeInput";
import DynamicButton from "@/components/dynamic-parameters/DynamicButton";

import "./DynamicParameters.less";

type OwnProps = {
    type?: string;
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
    dateOptions?: any;
};

type Props = OwnProps & typeof DynamicDatePicker.defaultProps;

class DynamicDatePicker extends React.Component<Props> {
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

  dateComponentRef: any;

  constructor(props: Props) {
    super(props);
    this.dateComponentRef = React.createRef();
  }

  onDynamicValueSelect = (dynamicValue: any) => {
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
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'withSeconds' does not exist on type '{}'... Remove this comment to see the full error message
        additionalAttributes.withSeconds = true;
      }
    }

    if (moment.isMoment(value) || value === null) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type '{}'.
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      const dynamicDate = value;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'placeholder' does not exist on type '{}'... Remove this comment to see the full error message
      additionalAttributes.placeholder = dynamicDate && dynamicDate.name;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type '{}'.
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
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(dynamicValue: any) => void' is not assignab... Remove this comment to see the full error message
          onSelect={this.onDynamicValueSelect}
        />
      </div>
    );
  }
}

export default DynamicDatePicker;
