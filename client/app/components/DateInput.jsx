import moment from 'moment';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import DatePicker from 'antd/lib/date-picker';

function DateInput({
  value,
  onSelect,
  clientConfig,
}) {
  const format = clientConfig.dateFormat || 'YYYY-MM-DD';
  const defaultValue = moment(value, format);
  return (
    <DatePicker
      {...(defaultValue.isValid() ? { defaultValue } : {})}
      format={format}
      placeholder="Select Date"
      onChange={onSelect}
    />
  );
}

DateInput.propTypes = {
  value: (props, propName, componentName) => {
    const value = props[propName];
    if ((value !== null) && !moment.isMoment(props[propName])) {
      return new Error('Prop `' + propName + '` supplied to `' + componentName +
        '` should be a Moment.js instance.');
    }
  },
  onSelect: PropTypes.func,
};

DateInput.defaultProps = {
  value: null,
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('dateInput', react2angular(DateInput, null, ['clientConfig']));
}

