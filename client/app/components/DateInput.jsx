import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

export function DateInput({
  value,
  onSelect,
  className,
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
  const additionalAttributes = {};
  if (value && value.isValid()) {
    additionalAttributes.defaultValue = value;
  }
  return (
    <DatePicker
      className={className}
      {...additionalAttributes}
      format={format}
      placeholder="Select Date"
      onChange={onSelect}
    />
  );
}

DateInput.propTypes = {
  value: Moment,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

DateInput.defaultProps = {
  value: null,
  onSelect: () => {},
  className: '',
};

export default function init(ngModule) {
  ngModule.component('dateInput', react2angular(DateInput));
}

init.init = true;
