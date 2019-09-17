import React from 'react';
import PropTypes from 'prop-types';
import { head, includes, toString, map } from 'lodash';

import Input from 'antd/lib/input';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';

import './Criteria.less';

const CONDITIONS = {
  'greater than': '>',
  'less than': '<',
  equals: '=',
};

const VALID_STRING_CONDITIONS = ['equals'];

function WarningIcon() {
  return <Icon type="warning" theme="filled" style={{ color: '#ff4d4f' }} />;
}

function DisabledInput({ children, minWidth }) {
  return (
    <div className="criteria-disabled-input" style={{ minWidth }}>{children}</div>
  );
}

DisabledInput.propTypes = {
  children: PropTypes.node.isRequired,
  minWidth: PropTypes.number.isRequired,
};

export default function Criteria({ columnNames, resultValues, alertOptions, onChange, editMode }) {
  const columnValue = resultValues && head(resultValues)[alertOptions.column];
  const invalidMessage = () => {
    // bail if condition is valid for strings
    if (includes(VALID_STRING_CONDITIONS, alertOptions.op)) {
      return null;
    }

    if (isNaN(alertOptions.value)) {
      return <small><WarningIcon /> Value column type doesn&apos;t match threshold type.</small>;
    }

    if (isNaN(columnValue)) {
      return <small><WarningIcon /> Value column isn&apos;t supported by condition type.</small>;
    }

    return null;
  };

  const columnHint = (
    <small className="alert-criteria-hint">
      Top row value is <code className="p-0">{toString(columnValue) || 'unknown'}</code>
    </small>
  );

  return (
    <div className="alert-trigger">
      <div className="input-title">
        <span>Value column</span>
        {editMode ? (
          <Select
            value={alertOptions.column}
            onChange={column => onChange({ column })}
            dropdownMatchSelectWidth={false}
            style={{ minWidth: 100 }}
          >
            {columnNames.map(name => (
              <Select.Option key={name}>{name}</Select.Option>
            ))}
          </Select>
        ) : (
          <DisabledInput minWidth={70}>{alertOptions.column}</DisabledInput>
        )}
      </div>
      <div className="input-title">
        <span>Condition</span>
        {editMode ? (
          <Select
            value={alertOptions.op}
            onChange={op => onChange({ op })}
            optionLabelProp="label"
            dropdownMatchSelectWidth={false}
            style={{ width: 55 }}
            id="condition"
          >
            {map(CONDITIONS, (v, k) => (
              <Select.Option value={k} label={v} key={k}>
                {v} &nbsp;{k}
              </Select.Option>
            ))}
          </Select>
        ) : (
          <DisabledInput minWidth={50}>{CONDITIONS[alertOptions.op]}</DisabledInput>
        )}
      </div>
      <div className="input-title">
        <span>Threshold</span>
        {editMode ? (
          <Input className="alert-threshold" value={alertOptions.value} onChange={e => onChange({ value: e.target.value })} />
        ) : (
          <DisabledInput minWidth={50}>{alertOptions.value}</DisabledInput>
        )}
      </div>
      <div className="ant-form-explain">
        {columnHint}<br />{invalidMessage()}
      </div>
    </div>
  );
}

Criteria.propTypes = {
  columnNames: PropTypes.arrayOf(PropTypes.string).isRequired,
  resultValues: PropTypes.arrayOf(PropTypes.object).isRequired,
  alertOptions: PropTypes.shape({
    column: PropTypes.string,
    op: PropTypes.oneOf(['greater than', 'less than', 'equals']).isRequired,
    value: PropTypes.any.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  editMode: PropTypes.bool.isRequired,
};
