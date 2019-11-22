import { map } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';

const CohortTimeIntervals = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const CohortModes = {
  diagonal: 'Fill gaps with zeros',
  simple: 'Show data as is',
};

export default function OptionsSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Section>
        <label htmlFor="cohort-time-interval">Time Interval</label>
        <Select
          data-test="Cohort.TimeInterval"
          id="cohort-time-interval"
          className="w-100"
          value={options.timeInterval}
          onChange={timeInterval => onOptionsChange({ timeInterval })}
        >
          {map(CohortTimeIntervals, (name, value) => (
            <Select.Option key={value} data-test={'Cohort.TimeInterval.' + value}>{name}</Select.Option>
          ))}
        </Select>
      </Section>

      <Section>
        <label htmlFor="cohort-time-mode">Mode</label>
        <Select
          data-test="Cohort.Mode"
          id="cohort-mode"
          className="w-100"
          value={options.mode}
          onChange={mode => onOptionsChange({ mode })}
        >
          {map(CohortModes, (name, value) => (
            <Select.Option key={value} data-test={'Cohort.Mode.' + value}>{name}</Select.Option>
          ))}
        </Select>
      </Section>
    </React.Fragment>
  );
}

OptionsSettings.propTypes = EditorPropTypes;
