import { isArray } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

const { RangePicker } = DatePicker;

export const PRESETTED_RANGES = {
  Yesterday: () => [moment().subtract(1, 'day').startOf('day'), moment().subtract(1, 'day').endOf('day')],
  'Last week': () => [moment().subtract(1, 'week').startOf('week'), moment().subtract(1, 'week').endOf('week')],
  'Last month': () => [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')],
  'Last year': () => [moment().subtract(1, 'year').startOf('year'), moment().subtract(1, 'year').endOf('year')],
  'Last 7 days': () => [moment().subtract(7, 'days'), moment()],
  'Last 30 days': () => [moment().subtract(30, 'days'), moment()],
};

export function DateRangeInput({
  value,
  onSelect,
  className,
  showPresettedRanges,
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
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
      {...additionalAttributes}
      format={format}
      onChange={onSelect}
    />
  );
}

DateRangeInput.propTypes = {
  value: PropTypes.arrayOf(Moment),
  onSelect: PropTypes.func,
  className: PropTypes.string,
  showPresettedRanges: PropTypes.bool,
};

DateRangeInput.defaultProps = {
  value: null,
  onSelect: () => {},
  className: '',
  showPresettedRanges: true,
};

export default function init(ngModule) {
  ngModule.component('dateRangeInput', react2angular(DateRangeInput));
}

init.init = true;
