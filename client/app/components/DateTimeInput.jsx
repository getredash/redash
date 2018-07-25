import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { DatePicker } from 'antd';
import 'antd/dist/antd.less';

function DateTimeInput({
  value,
  withSeconds,
  placeholder,
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
      placeholder={placeholder}
      onChange={onSelect}
    />
  );
}

DateTimeInput.propTypes = {
  value: PropTypes.instanceOf(Date),
  withSeconds: PropTypes.bool,
  placeholder: PropTypes.string,
  onSelect: PropTypes.func,
};

DateTimeInput.defaultProps = {
  value: Date.now(),
  withSeconds: false,
  placeholder: 'Select date and time',
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('dateTimeInput', react2angular(DateTimeInput, null, ['clientConfig']));
}

