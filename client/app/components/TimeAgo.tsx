import moment from "moment";
import { isNil } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";
import { clientConfig } from "@/services/auth";
import Tooltip from "antd/lib/tooltip";
function toMoment(value: any) {
    value = !isNil(value) ? moment(value) : null;
    return value && value.isValid() ? value : null;
}
type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    date?: string | number | any | Moment;
    placeholder?: string;
    autoUpdate?: boolean;
    variation?: "timeAgoInTooltip";
};
type Props = OwnProps & typeof TimeAgo.defaultProps;
export default function TimeAgo({ date, placeholder, autoUpdate, variation }: Props) {
    const startDate = toMoment(date);
    const [value, setValue] = useState(null);
    const title = useMemo(() => (startDate ? startDate.format((clientConfig as any).dateTimeFormat) : null), [startDate]);
    useEffect(() => {
        function update() {
            setValue(startDate ? startDate.fromNow() : placeholder);
        }
        update();
        if (autoUpdate) {
            const timer = setInterval(update, 30 * 1000);
            return () => clearInterval(timer);
        }
    }, [autoUpdate, startDate, placeholder]);
    if (variation === "timeAgoInTooltip") {
        return (<Tooltip title={value}>
        <span data-test="TimeAgo">{title}</span>
      </Tooltip>);
    }
    return (<Tooltip title={title}>
      <span data-test="TimeAgo">{value}</span>
    </Tooltip>);
}
TimeAgo.defaultProps = {
    date: null,
    placeholder: "",
    autoUpdate: true,
};
