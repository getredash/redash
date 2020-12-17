import React from "react";
import { includes } from "lodash";
import { getDynamicDateRangeFromString } from "@/services/parameters/DateRangeParameter";
import DynamicDateRangePicker from "@/components/dynamic-parameters/DynamicDateRangePicker";

const DYNAMIC_DATE_OPTIONS = [
  {
    name: "This week",
    value: getDynamicDateRangeFromString("d_this_week"),
    label: () =>
      getDynamicDateRangeFromString("d_this_week")
        .value()[0]
        .format("MMM D") +
      " - " +
      getDynamicDateRangeFromString("d_this_week")
        .value()[1]
        .format("MMM D"),
  },
  {
    name: "This month",
    value: getDynamicDateRangeFromString("d_this_month"),
    label: () =>
      getDynamicDateRangeFromString("d_this_month")
        .value()[0]
        .format("MMMM"),
  },
  {
    name: "This year",
    value: getDynamicDateRangeFromString("d_this_year"),
    label: () =>
      getDynamicDateRangeFromString("d_this_year")
        .value()[0]
        .format("YYYY"),
  },
  {
    name: "Last week",
    value: getDynamicDateRangeFromString("d_last_week"),
    label: () =>
      getDynamicDateRangeFromString("d_last_week")
        .value()[0]
        .format("MMM D") +
      " - " +
      getDynamicDateRangeFromString("d_last_week")
        .value()[1]
        .format("MMM D"),
  },
  {
    name: "Last month",
    value: getDynamicDateRangeFromString("d_last_month"),
    label: () =>
      getDynamicDateRangeFromString("d_last_month")
        .value()[0]
        .format("MMMM"),
  },
  {
    name: "Last year",
    value: getDynamicDateRangeFromString("d_last_year"),
    label: () =>
      getDynamicDateRangeFromString("d_last_year")
        .value()[0]
        .format("YYYY"),
  },
  {
    name: "Last 7 days",
    value: getDynamicDateRangeFromString("d_last_7_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_7_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 14 days",
    value: getDynamicDateRangeFromString("d_last_14_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_14_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 30 days",
    value: getDynamicDateRangeFromString("d_last_30_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_30_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 60 days",
    value: getDynamicDateRangeFromString("d_last_60_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_60_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 90 days",
    value: getDynamicDateRangeFromString("d_last_90_days"),
    label: () =>
      getDynamicDateRangeFromString("d_last_90_days")
        .value()[0]
        .format("MMM D") + " - Today",
  },
  {
    name: "Last 12 months",
    value: getDynamicDateRangeFromString("d_last_12_months"),
    label: null,
  },
];

const DYNAMIC_DATETIME_OPTIONS = [
  {
    name: "Today",
    value: getDynamicDateRangeFromString("d_today"),
    label: () =>
      getDynamicDateRangeFromString("d_today")
        .value()[0]
        .format("MMM D"),
  },
  {
    name: "Yesterday",
    value: getDynamicDateRangeFromString("d_yesterday"),
    label: () =>
      getDynamicDateRangeFromString("d_yesterday")
        .value()[0]
        .format("MMM D"),
  },
  ...DYNAMIC_DATE_OPTIONS,
];

type OwnProps = {
    type?: string;
    className?: string;
    value?: any;
    parameter?: any;
    onSelect?: (...args: any[]) => any;
};

type Props = OwnProps & typeof DateRangeParameter.defaultProps;

function DateRangeParameter(props: Props) {
  const options = includes(props.type, "datetime-range") ? DYNAMIC_DATETIME_OPTIONS : DYNAMIC_DATE_OPTIONS;
  // @ts-expect-error ts-migrate(2322) FIXME: Type '({ name: string; value: any; label: () => an... Remove this comment to see the full error message
  return <DynamicDateRangePicker {...props} dynamicButtonOptions={{ options }} />;
}

DateRangeParameter.defaultProps = {
  type: "",
  className: "",
  value: null,
  parameter: null,
  onSelect: () => {},
};

export default DateRangeParameter;
