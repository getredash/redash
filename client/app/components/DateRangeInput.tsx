import { isArray } from "lodash";
import React from "react";
import DatePicker from "antd/lib/date-picker";
import { clientConfig } from "@/services/auth";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";
const { RangePicker } = DatePicker;
type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    defaultValue?: Moment[];
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    value?: Moment[];
    onSelect?: (...args: any[]) => any;
    className?: string;
};
const DateRangeInput = React.forwardRef<any, Props>(({ defaultValue, value, onSelect, className, ...props }, ref) => {
    const format = (clientConfig as any).dateFormat || "YYYY-MM-DD";
    const additionalAttributes = {};
    if (isArray(defaultValue) && defaultValue[0].isValid() && defaultValue[1].isValid()) {
        (additionalAttributes as any).defaultValue = defaultValue;
    }
    if (value === null || (isArray(value) && value[0].isValid() && value[1].isValid())) {
        (additionalAttributes as any).value = value;
    }
    return (<RangePicker ref={ref} className={className} {...additionalAttributes} format={format} onChange={onSelect} {...props}/>);
});
DateRangeInput.defaultProps = {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'null' is not assignable to type 'any[] | und... Remove this comment to see the full error message
    defaultValue: null,
    value: undefined,
    onSelect: () => { },
    className: "",
};
export default DateRangeInput;
