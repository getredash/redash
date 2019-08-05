import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import { includes, isArray, isObject } from 'lodash';
import { isDynamicDateRange, getDynamicDateRange } from '@/services/query';
import DateRangeInput from '@/components/DateRangeInput';
import DateTimeRangeInput from '@/components/DateTimeRangeInput';
import DynamicButton from '@/components/dynamic-parameters/DynamicButton';

import './DynamicParameters.less';

const DYNAMIC_DATE_OPTIONS = [
  { name: 'This week',
    value: 'd_this_week',
    label: () => getDynamicDateRange('d_this_week').value()[0].format('MMM D') + ' - ' +
                 getDynamicDateRange('d_this_week').value()[1].format('MMM D') },
  { name: 'This month', value: 'd_this_month', label: () => getDynamicDateRange('d_this_month').value()[0].format('MMMM') },
  { name: 'This year', value: 'd_this_year', label: () => getDynamicDateRange('d_this_year').value()[0].format('YYYY') },
  { name: 'Last week',
    value: 'd_last_week',
    label: () => getDynamicDateRange('d_last_week').value()[0].format('MMM D') + ' - ' +
                 getDynamicDateRange('d_last_week').value()[1].format('MMM D') },
  { name: 'Last month', value: 'd_last_month', label: () => getDynamicDateRange('d_last_month').value()[0].format('MMMM') },
  { name: 'Last year', value: 'd_last_year', label: () => getDynamicDateRange('d_last_year').value()[0].format('YYYY') },
  { name: 'Last 7 days',
    value: 'd_last_7_days',
    label: () => getDynamicDateRange('d_last_7_days').value()[0].format('MMM D') + ' - Today' },
];

const DYNAMIC_DATETIME_OPTIONS = [
  { name: 'Today',
    value: 'd_today',
    label: () => getDynamicDateRange('d_today').value()[0].format('MMM D') },
  { name: 'Yesterday',
    value: 'd_yesterday',
    label: () => getDynamicDateRange('d_yesterday').value()[0].format('MMM D') },
  ...DYNAMIC_DATE_OPTIONS,
];

const widthByType = {
  'date-range': 294,
  'datetime-range': 352,
  'datetime-range-with-seconds': 382,
};

function isValidDateRangeValue(value) {
  return isArray(value) && value.length === 2 && moment.isMoment(value[0]) && moment.isMoment(value[1]);
}

class DateRangeParameter extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    className: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    onSelect: PropTypes.func,
  };

  static defaultProps = {
    type: '',
    className: '',
    value: null,
    parameter: null,
    onSelect: () => {},
  };

  constructor(props) {
    super(props);
    this.dateRangeComponentRef = React.createRef();
  }

  onDynamicValueSelect = (dynamicValue) => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue === 'static') {
      const parameterValue = parameter.getValue();
      if (isObject(parameterValue) && parameterValue.start && parameterValue.end) {
        onSelect([moment(parameterValue.start), moment(parameterValue.end)]);
      } else {
        onSelect(null);
      }
    } else {
      onSelect(dynamicValue.value);
    }
    // give focus to the DatePicker to get keyboard shortcuts to work
    this.dateRangeComponentRef.current.focus();
  };

  render() {
    const { type, value, onSelect, className } = this.props;
    const isDateTimeRange = includes(type, 'datetime-range');
    const hasDynamicValue = isDynamicDateRange(value);
    const options = isDateTimeRange ? DYNAMIC_DATETIME_OPTIONS : DYNAMIC_DATE_OPTIONS;

    const additionalAttributes = {};

    let DateRangeComponent = DateRangeInput;
    if (isDateTimeRange) {
      DateRangeComponent = DateTimeRangeInput;
      if (includes(type, 'with-seconds')) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (isValidDateRangeValue(value) || value === null) {
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      const dynamicDateRange = getDynamicDateRange(value);
      additionalAttributes.placeholder = [dynamicDateRange && dynamicDateRange.name];
      additionalAttributes.value = null;
    }

    return (
      <DateRangeComponent
        ref={this.dateRangeComponentRef}
        className={classNames('redash-datepicker date-range-input', { 'dynamic-value': hasDynamicValue }, className)}
        onSelect={onSelect}
        style={{ width: hasDynamicValue ? 195 : widthByType[type] }}
        suffixIcon={(
          <DynamicButton
            options={options}
            selectedDynamicValue={hasDynamicValue ? value : null}
            enabled={hasDynamicValue}
            onSelect={this.onDynamicValueSelect}
          />
        )}
        {...additionalAttributes}
      />
    );
  }
}

export default DateRangeParameter;
