import React from "react";
import { extend, isString } from "lodash";
import numeral from "numeral";
import Tooltip from "antd/lib/tooltip";

type HelpTriggerProps = {
  title?: React.ReactNode;
  href: string;
  className?: string;
  children?: React.ReactNode;
};

function HelpTrigger({ title, href, className, children }: HelpTriggerProps) {
  return (
    <Tooltip
      title={
        <React.Fragment>
          {title}
          <i className="fa fa-external-link" style={{ marginLeft: 5 }} />
        </React.Fragment>
      }>
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    </Tooltip>
  );
}

HelpTrigger.defaultValues = {
  title: null,
  className: null,
  children: null,
};

function Link(props: any) {
  return <a {...props} />;
}

const DEFAULT_THOUSANDS_SEPARATOR = ",";
const DEFAULT_DECIMAL_SEPARATOR = ".";

export const visualizationsSettings = {
  HelpTriggerComponent: HelpTrigger,
  LinkComponent: Link,
  dateFormat: "DD/MM/YYYY",
  dateTimeFormat: "DD/MM/YYYY HH:mm",
  integerFormat: "0,0",
  floatFormat: "0,0.00",
  thousandsSeparator: DEFAULT_THOUSANDS_SEPARATOR,
  decimalSeparator: DEFAULT_DECIMAL_SEPARATOR,
  nullValue: "null",
  booleanValues: ["false", "true"],
  tableCellMaxJSONSize: 50000,
  allowCustomJSVisualizations: false,
  hidePlotlyModeBar: false,
  choroplethAvailableMaps: {},
};

export function updateVisualizationsSettings(options: any) {
  extend(visualizationsSettings, options);

  // `,` and `.` in numeral format strings are locale markers, not literal characters —
  // the rendered separators come from the active locale's delimiters. Override them so
  // settings like a space thousands separator (e.g. "1 234 567") are reachable. Each
  // separator is applied independently and falls back to its en default when not a string,
  // so a non-string value never leaves numeral stuck on a stale override.
  const { thousandsSeparator, decimalSeparator } = visualizationsSettings;
  extend(numeral.localeData().delimiters, {
    thousands: isString(thousandsSeparator) ? thousandsSeparator : DEFAULT_THOUSANDS_SEPARATOR,
    decimal: isString(decimalSeparator) ? decimalSeparator : DEFAULT_DECIMAL_SEPARATOR,
  });
}
