import React from "react";
import DatePicker from "antd/lib/date-picker";
import { clientConfig } from "@/services/auth";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";
type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    defaultValue?: Moment;
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    value?: Moment;
    onSelect?: (...args: any[]) => any;
    className?: string;
};
const DateInput = React.forwardRef<any, Props>(({ defaultValue, value, onSelect, className, ...props }, ref) => {
    const format = (clientConfig as any).dateFormat || "YYYY-MM-DD";
    const additionalAttributes = {};
    if (defaultValue && defaultValue.isValid()) {
        (additionalAttributes as any).defaultValue = defaultValue;
    }
    if (value === null || (value && value.isValid())) {
        (additionalAttributes as any).value = value;
    }
    return (<DatePicker ref={ref} className={className} {...additionalAttributes} format={format} placeholder="Select Date" onChange={onSelect} {...props}/>);
});
DateInput.defaultProps = {
    defaultValue: null,
    value: undefined,
    onSelect: () => { },
    className: "",
};
export default DateInput;
