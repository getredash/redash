import { isArray } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';
import { PRESETTED_RANGES } from './DateRangeInput';

const { RangePicker } = DatePicker;

export function DateTimeRangeInput({
  value,
  withSeconds,
  onSelect,
  className,
  showPresettedRanges,
}) {
  const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
    (withSeconds ? ' HH:mm:ss' : ' HH:mm');
  const additionalAttributes = {};
  if (isArray(value) && value[0].isValid() && value[1].isValid()) {
    additionalAttributes.defaultValue = value;
  }

  if (showPresettedRanges) {
    additionalAttributes.ranges = PRESETTED_RANGES;
  }

  return (
    <RangePicker
      className={className}
      showTime
      {...additionalAttributes}
      format={format}
      onChange={onSelect}
    />
  );
}

DateTimeRangeInput.propTypes = {
  value: PropTypes.arrayOf(Moment),
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
  className: PropTypes.string,
  showPresettedRanges: PropTypes.bool,
};

DateTimeRangeInput.defaultProps = {
  value: null,
  withSeconds: false,
  onSelect: () => {},
  className: '',
  showPresettedRanges: true,
};

export default function init(ngModule) {
  ngModule.component('dateTimeRangeInput', react2angular(DateTimeRangeInput));
}

init.init = true;
