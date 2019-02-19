import { isArray } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';
import { clientConfig } from '@/services/auth';
import { Moment } from '@/components/proptypes';

const { RangePicker } = DatePicker;

export function DateRangeInput({
  value,
  onSelect,
  className,
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
  const additionalAttributes = {};
  if (isArray(value) && value[0].isValid() && value[1].isValid()) {
    additionalAttributes.defaultValue = value;
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
};

DateRangeInput.defaultProps = {
  value: null,
  onSelect: () => {},
  className: '',
};

export default function init(ngModule) {
  ngModule.component('dateRangeInput', react2angular(DateRangeInput));
}

init.init = true;
