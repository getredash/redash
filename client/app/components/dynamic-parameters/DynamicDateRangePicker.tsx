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
        onSelect: () => { },
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
            if (isObject(parameterValue) && (parameterValue as any).start && (parameterValue as any).end) {
                onSelect([moment((parameterValue as any).start), moment((parameterValue as any).end)]);
            }
            else {
                onSelect(null);
            }
        }
        else {
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
                (additionalAttributes as any).withSeconds = true;
            }
        }
        if (isValidDateRangeValue(value) || value === null) {
            (additionalAttributes as any).value = value;
        }
        if (hasDynamicValue) {
            (additionalAttributes as any).placeholder = [value && value.name];
            (additionalAttributes as any).value = null;
        }
        return (<div {...rest} className={classNames("date-range-parameter", className)}>
        <DateRangeComponent {...dateRangeOptions} ref={this.dateRangeComponentRef} className={classNames("redash-datepicker date-range-input", type, { "dynamic-value": hasDynamicValue })} onSelect={onSelect} suffixIcon={null} {...additionalAttributes}/>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(dynamicValue: any) => void' is not assignab... Remove this comment to see the full error message */}
        <DynamicButton options={dynamicButtonOptions.options} staticValueLabel={dynamicButtonOptions.staticValueLabel} selectedDynamicValue={hasDynamicValue ? value : null} enabled={hasDynamicValue} onSelect={this.onDynamicValueSelect}/>
      </div>);
    }
}
export default DynamicDateRangePicker;
