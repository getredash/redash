import { map, merge } from 'lodash';
import React from 'react';
import Tabs from 'antd/lib/tabs';
import Select from 'antd/lib/select';
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

export default function Editor({ options, data, onOptionsChange }) {
  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <Tabs animated={false} tabBarGutter={0}>
      <Tabs.TabPane key="columns" tab={<span data-test="Cohort.EditorTabs.Columns">Columns</span>}>
        <div className="m-b-15">
          <label htmlFor="cohort-date-column">Date (Bucket)</label>
          <Select
            data-test="Cohort.DateColumn"
            id="cohort-date-column"
            className="w-100"
            value={options.dateColumn}
            onChange={dateColumn => optionsChanged({ dateColumn })}
          >
            {map(data.columns, ({ name }) => (
              <Select.Option key={name} data-test={'Cohort.DateColumn.' + name}>{name}</Select.Option>
            ))}
          </Select>
        </div>

        <div className="m-b-15">
          <label htmlFor="cohort-stage-column">Stage</label>
          <Select
            data-test="Cohort.StageColumn"
            id="cohort-stage-column"
            className="w-100"
            value={options.stageColumn}
            onChange={stageColumn => optionsChanged({ stageColumn })}
          >
            {map(data.columns, ({ name }) => (
              <Select.Option key={name} data-test={'Cohort.StageColumn.' + name}>{name}</Select.Option>
            ))}
          </Select>
        </div>

        <div className="m-b-15">
          <label htmlFor="cohort-total-column">Bucket Population Size</label>
          <Select
            data-test="Cohort.TotalColumn"
            id="cohort-total-column"
            className="w-100"
            value={options.totalColumn}
            onChange={totalColumn => optionsChanged({ totalColumn })}
          >
            {map(data.columns, ({ name }) => (
              <Select.Option key={name} data-test={'Cohort.TotalColumn.' + name}>{name}</Select.Option>
            ))}
          </Select>
        </div>

        <div className="m-b-15">
          <label htmlFor="cohort-value-column">Stage Value</label>
          <Select
            data-test="Cohort.ValueColumn"
            id="cohort-value-column"
            className="w-100"
            value={options.valueColumn}
            onChange={valueColumn => optionsChanged({ valueColumn })}
          >
            {map(data.columns, ({ name }) => (
              <Select.Option key={name} data-test={'Cohort.ValueColumn.' + name}>{name}</Select.Option>
            ))}
          </Select>
        </div>
      </Tabs.TabPane>
      <Tabs.TabPane key="options" tab={<span data-test="Cohort.EditorTabs.Options">Options</span>}>
        <div className="m-b-15">
          <label htmlFor="cohort-time-interval">Time Interval</label>
          <Select
            data-test="Cohort.TimeInterval"
            id="cohort-time-interval"
            className="w-100"
            value={options.timeInterval}
            onChange={timeInterval => optionsChanged({ timeInterval })}
          >
            {map(CohortTimeIntervals, (name, value) => (
              <Select.Option key={value} data-test={'Cohort.TimeInterval.' + value}>{name}</Select.Option>
            ))}
          </Select>
        </div>

        <div className="m-b-15">
          <label htmlFor="cohort-time-mode">Mode</label>
          <Select
            data-test="Cohort.Mode"
            id="cohort-mode"
            className="w-100"
            value={options.mode}
            onChange={mode => optionsChanged({ mode })}
          >
            {map(CohortModes, (name, value) => (
              <Select.Option key={value} data-test={'Cohort.Mode.' + value}>{name}</Select.Option>
            ))}
          </Select>
        </div>
      </Tabs.TabPane>
    </Tabs>
  );
}

Editor.propTypes = EditorPropTypes;
