import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';

function DateTimeInput({
  value,
  withSeconds,
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
      placeholder="Select Date and Time"
      onChange={onSelect}
    />
  );
}

DateTimeInput.propTypes = {
  value: (props, propName, componentName) => {
    const value = props[propName];
    if ((value !== null) && !moment.isMoment(props[propName])) {
      return new Error('Prop `' + propName + '` supplied to `' + componentName +
        '` should be a Moment.js instance.');
    }
  },
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
};

DateTimeInput.defaultProps = {
  value: null,
  withSeconds: false,
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('dateTimeInput', react2angular(DateTimeInput, null, ['clientConfig']));
}

