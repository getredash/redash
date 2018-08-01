import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { DatePicker } from 'antd';

function DateInput({
  value,
  onSelect,
  clientConfig,
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
  const defaultValue = moment(value, format);
  return (
    <DatePicker
      {...(defaultValue.isValid() ? { defaultValue } : {})}
      format={format}
      placeholder="Select Date"
      onChange={onSelect}
    />
  );
}

DateInput.propTypes = {
  value: PropTypes.instanceOf(Date),
  onSelect: PropTypes.func,
};

DateInput.defaultProps = {
  value: Date.now(),
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('dateInput', react2angular(DateInput, null, ['clientConfig']));
}

