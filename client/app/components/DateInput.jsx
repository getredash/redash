import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

export function DateInput({
  defaultValue,
  value,
  onSelect,
  className,
  hideValue,
  ...props
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
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
      {...additionalAttributes}
      format={format}
      placeholder="Select Date"
      onChange={onSelect}
      {...props}
    />
  );
}

DateInput.propTypes = {
  defaultValue: Moment,
  value: Moment,
  onSelect: PropTypes.func,
  className: PropTypes.string,
  hideValue: PropTypes.bool,
};

DateInput.defaultProps = {
  defaultValue: null,
  value: null,
  onSelect: () => {},
  className: '',
  hideValue: false,
};

export default function init(ngModule) {
  ngModule.component('dateInput', react2angular(DateInput));
}

init.init = true;
