import moment from 'moment';
import { isArray } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { RangePicker } from 'antd/lib/date-picker';

function DateTimeRangeInput({
  value,
  withSeconds,
  onSelect,
  // eslint-disable-next-line react/prop-types
  clientConfig,
}) {
  const format = (clientConfig.dateFormat || 'YYYY-MM-DD') +
    (withSeconds ? ' HH:mm:ss' : ' HH:mm');
  const additionalAttributes = {};
  if (isArray(value) && value[0].isValid() && value[1].isValid()) {
    additionalAttributes.defaultValue = value;
  }
  return (
    <RangePicker
      showTime
      {...additionalAttributes}
      format={format}
      onChange={onSelect}
    />
  );
}

DateTimeRangeInput.propTypes = {
  value: (props, propName, componentName) => {
    const value = props[propName];
    if (
      (value !== null) && !(
        isArray(value) && (value.length === 2) &&
        moment.isMoment(value[0]) && moment.isMoment(value[1])
      )
    ) {
      return new Error('Prop `' + propName + '` supplied to `' + componentName +
        '` should be an array of two Moment.js instances.');
    }
  },
  withSeconds: PropTypes.bool,
  onSelect: PropTypes.func,
};

DateTimeRangeInput.defaultProps = {
  value: null,
  withSeconds: false,
  onSelect: () => {},
};

export default function init(ngModule) {
  ngModule.component('dateTimeRangeInput', react2angular(DateTimeRangeInput, null, ['clientConfig']));
}

init.init = true;

