import { map } from "lodash";
import React from "react";
import { Section, Select } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

const CohortTimeIntervals = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const CohortModes = {
  diagonal: "Fill gaps with zeros",
  simple: "Show data as is",
};

export default function OptionsSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <Select
          layout="horizontal"
          label="Time Interval"
          data-test="Cohort.TimeInterval"
          value={options.timeInterval}
          onChange={timeInterval => onOptionsChange({ timeInterval })}>
          {map(CohortTimeIntervals, (name, value) => (
            <Select.Option key={value} data-test={"Cohort.TimeInterval." + value}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <Select
          layout="horizontal"
          label="Mode"
          data-test="Cohort.Mode"
          value={options.mode}
          onChange={mode => onOptionsChange({ mode })}>
          {map(CohortModes, (name, value) => (
            <Select.Option key={value} data-test={"Cohort.Mode." + value}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>
    </React.Fragment>
  );
}

OptionsSettings.propTypes = EditorPropTypes;
