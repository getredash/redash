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
        onSelect: () => { },
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
            }
            else {
                onSelect(null);
            }
        }
        else {
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
                (additionalAttributes as any).withSeconds = true;
            }
        }
        if (moment.isMoment(value) || value === null) {
            (additionalAttributes as any).value = value;
        }
        if (hasDynamicValue) {
            const dynamicDate = value;
            (additionalAttributes as any).placeholder = dynamicDate && dynamicDate.name;
            (additionalAttributes as any).value = null;
        }
        return (<div className={classNames("date-parameter", className)}>
        <DateComponent {...dateOptions} ref={this.dateComponentRef} className={classNames("redash-datepicker", type, { "dynamic-value": hasDynamicValue })} onSelect={onSelect} suffixIcon={null} {...additionalAttributes}/>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(dynamicValue: any) => void' is not assignab... Remove this comment to see the full error message */}
        <DynamicButton options={dynamicButtonOptions.options} staticValueLabel={dynamicButtonOptions.staticValueLabel} selectedDynamicValue={hasDynamicValue ? value : null} enabled={hasDynamicValue} onSelect={this.onDynamicValueSelect}/>
      </div>);
    }
}
export default DynamicDatePicker;
