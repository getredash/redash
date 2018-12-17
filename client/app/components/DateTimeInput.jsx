import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';

export function DateTimeInput({
  value,
  withSeconds,
  onSelect,
  // eslint-disable-next-line react/prop-types
  clientConfig,
  className,
}) {
  const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
    (withSeconds ? ' HH:mm:ss' : ' HH:mm');
  const additionalAttributes = {};
  if (value && value.isValid()) {
    additionalAttributes.defaultValue = value;
  }
  return (
    <DatePicker
      className={className}
      showTime
      {...additionalAttributes}
      format={format}
      placeholder="Select Date and Time"
      onChange={onSelect}
    />
  );
}

DateTimeInput.propTypes = {
  value: (props, propName, componentName) => {
    const value = props[propName];
    if ((value !== null) && !moment.isMoment(value)) {
      return new Error('Prop `' + propName + '` supplied to `' + componentName +
        '` should be a Moment.js instance.');
    }
  },
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
  className: PropTypes.string,
};

DateTimeInput.defaultProps = {
  value: null,
  withSeconds: false,
  onSelect: () => {},
  className: '',
};

export default function init(ngModule) {
  ngModule.component('dateTimeInput', react2angular(DateTimeInput, null, ['clientConfig']));
}

init.init = true;
