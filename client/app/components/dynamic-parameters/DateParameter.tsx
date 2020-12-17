import React from "react";
import { getDynamicDateFromString } from "@/services/parameters/DateParameter";
import DynamicDatePicker from "@/components/dynamic-parameters/DynamicDatePicker";

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

type OwnProps = {
    type?: string;
    className?: string;
    value?: any;
    parameter?: any;
    onSelect?: (...args: any[]) => any;
};

type Props = OwnProps & typeof DateParameter.defaultProps;

function DateParameter(props: Props) {
  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ name: string; value: any; label: () => any... Remove this comment to see the full error message
  return <DynamicDatePicker dynamicButtonOptions={{ options: DYNAMIC_DATE_OPTIONS }} {...props} />;
}

DateParameter.defaultProps = {
  type: "",
  className: "",
  value: null,
  parameter: null,
  onSelect: () => {},
};

export default DateParameter;
