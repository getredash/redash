import { isArray } from 'lodash';
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

const { RangePicker } = DatePicker;

export function DateTimeRangeInput({
  value,
  withSeconds,
  onSelect,
  className,
}) {
  const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
    (withSeconds ? ' HH:mm:ss' : ' HH:mm');
  let defaultValue;
  if (isArray(value) && value[0].isValid() && value[1].isValid()) {
    defaultValue = value;
  }
  const [currentValue, setCurrentValue] = useState(defaultValue);
  return (
    <RangePicker
      className={className}
      showTime
      value={currentValue}
      format={format}
      onChange={newValue => setCurrentValue(newValue)}
      onOpenChange={(status) => {
        if (!status) { // on close picker
          if (isArray(currentValue) && currentValue[0].isValid() && currentValue[1].isValid()) {
            onSelect(currentValue);
          }
        }
      }}
    />
  );
}

DateTimeRangeInput.propTypes = {
  value: PropTypes.arrayOf(Moment),
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

DateTimeRangeInput.defaultProps = {
  value: null,
  withSeconds: false,
  onSelect: () => {},
  className: '',
};

export default function init(ngModule) {
  ngModule.component('dateTimeRangeInput', react2angular(DateTimeRangeInput));
}

init.init = true;
