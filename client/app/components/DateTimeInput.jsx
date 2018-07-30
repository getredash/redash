import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { DatePicker } from 'antd';

function DateTimeInput({
  value,
  withSeconds,
  onSelect,
  clientConfig,
}) {
  const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
    (withSeconds ? ' HH:mm:ss' : ' HH:mm');
  const defaultValue = moment(value, format);
  return (
    <DatePicker
      showTime
      {...(defaultValue.isValid() ? { defaultValue } : {})}
      format={format}
      placeholder="Select Date and Time"
      onChange={onSelect}
    />
  );
}

DateTimeInput.propTypes = {
  value: PropTypes.instanceOf(Date),
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
};

DateTimeInput.defaultProps = {
  value: Date.now(),
  withSeconds: false,
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('dateTimeInput', react2angular(DateTimeInput, null, ['clientConfig']));
}

