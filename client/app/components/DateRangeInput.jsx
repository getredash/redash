import { isArray } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

const { RangePicker } = DatePicker;

export function DateRangeInput({
  defaultValue,
  value,
  onSelect,
  className,
  hideValue,
  ...props
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
  const additionalAttributes = {};
  if (isArray(defaultValue) && defaultValue[0].isValid() && defaultValue[1].isValid()) {
    additionalAttributes.defaultValue = defaultValue;
  }
  if (isArray(value) && value[0].isValid() && value[1].isValid()) {
    additionalAttributes.value = value;
  }
  if (hideValue) {
    additionalAttributes.value = null;
  }
  return (
    <RangePicker
      className={className}
      {...additionalAttributes}
      format={format}
      onChange={onSelect}
      {...props}
    />
  );
}

DateRangeInput.propTypes = {
  defaultValue: PropTypes.arrayOf(Moment),
  value: PropTypes.arrayOf(Moment),
  onSelect: PropTypes.func,
  className: PropTypes.string,
  hideValue: PropTypes.bool,
};

DateRangeInput.defaultProps = {
  defaultValue: null,
  value: null,
  onSelect: () => {},
  className: '',
  hideValue: false,
};

export default function init(ngModule) {
  ngModule.component('dateRangeInput', react2angular(DateRangeInput));
}

init.init = true;
