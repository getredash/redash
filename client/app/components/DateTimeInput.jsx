import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

export function DateTimeInput({
  defaultValue,
  value,
  withSeconds,
  onSelect,
  className,
  hideValue,
  ...props
}) {
  const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
    (withSeconds ? ' HH:mm:ss' : ' HH:mm');
  const additionalAttributes = {};
  if (defaultValue && defaultValue.isValid()) {
    additionalAttributes.defaultValue = defaultValue;
  }
  if (value && value.isValid()) {
    additionalAttributes.value = value;
  }
  if (hideValue) {
    additionalAttributes.value = null;
  }
  return (
    <DatePicker
      className={className}
      showTime
      {...additionalAttributes}
      format={format}
      placeholder="Select Date and Time"
      onChange={onSelect}
      {...props}
    />
  );
}

DateTimeInput.propTypes = {
  defaultValue: Moment,
  value: Moment,
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
  className: PropTypes.string,
  hideValue: PropTypes.bool,
};

DateTimeInput.defaultProps = {
  defaultValue: null,
  value: null,
  withSeconds: false,
  onSelect: () => {},
  className: '',
  hideValue: false,
};

export default function init(ngModule) {
  ngModule.component('dateTimeInput', react2angular(DateTimeInput));
}

init.init = true;
