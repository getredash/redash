import { map } from 'lodash';
import React from 'react';
import Select from 'antd/lib/select';
import { EditorPropTypes } from '@/visualizations';

export default function ColumnsSettings({ options, data, onOptionsChange }) {
  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="cohort-date-column">Date (Bucket)</label>
        <Select
          data-test="Cohort.DateColumn"
          id="cohort-date-column"
          className="w-100"
          value={options.dateColumn}
          onChange={dateColumn => onOptionsChange({ dateColumn })}
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
          onChange={stageColumn => onOptionsChange({ stageColumn })}
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
          onChange={totalColumn => onOptionsChange({ totalColumn })}
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
          onChange={valueColumn => onOptionsChange({ valueColumn })}
        >
          {map(data.columns, ({ name }) => (
            <Select.Option key={name} data-test={'Cohort.ValueColumn.' + name}>{name}</Select.Option>
          ))}
        </Select>
      </div>
    </React.Fragment>
  );
}

ColumnsSettings.propTypes = EditorPropTypes;
