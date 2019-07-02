import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import { includes, isArray, isString } from 'lodash';
import { DYNAMIC_DATE_RANGES } from '@/services/query';
import { DateRangeInput } from '@/components/DateRangeInput';
import { DateTimeRangeInput } from '@/components/DateTimeRangeInput';
import DynamicButton from '@/components/dynamic-parameters/DynamicButton';

import './DynamicParameters.less';

const DYNAMIC_DATE_OPTIONS = [
  { name: 'This week',
    value: 'd_this_week',
    label: () => DYNAMIC_DATE_RANGES.this_week.value()[0].format('MMM D') + ' - ' +
                 DYNAMIC_DATE_RANGES.this_week.value()[1].format('MMM D') },
  { name: 'This month', value: 'd_this_month', label: () => DYNAMIC_DATE_RANGES.this_month.value()[0].format('MMMM') },
  { name: 'This year', value: 'd_this_year', label: () => DYNAMIC_DATE_RANGES.this_year.value()[0].format('YYYY') },
  { name: 'Last week',
    value: 'd_last_week',
    label: () => DYNAMIC_DATE_RANGES.last_week.value()[0].format('MMM D') + ' - ' +
                 DYNAMIC_DATE_RANGES.last_week.value()[1].format('MMM D') },
  { name: 'Last month', value: 'd_last_month', label: () => DYNAMIC_DATE_RANGES.last_month.value()[0].format('MMMM') },
  { name: 'Last year', value: 'd_last_year', label: () => DYNAMIC_DATE_RANGES.last_year.value()[0].format('YYYY') },
  { name: 'Last 7 days',
    value: 'd_last_7_days',
    label: () => DYNAMIC_DATE_RANGES.last_7_days.value()[0].format('MMM D') + ' - Today' },
];

const DYNAMIC_DATETIME_OPTIONS = [
  { name: 'Today',
    value: 'd_today',
    label: () => DYNAMIC_DATE_RANGES.today.value()[0].format('MMM D') },
  { name: 'Yesterday',
    value: 'd_yesterday',
    label: () => DYNAMIC_DATE_RANGES.yesterday.value()[0].format('MMM D') },
  ...DYNAMIC_DATE_OPTIONS,
];

function isValidDateRangeValue(value) {
  return isArray(value) && value.length === 2 && moment.isMoment(value[0]) && moment.isMoment(value[1]);
}

export default class DateRangeParameter extends React.Component {
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
    this.state = { hasDynamicValue: !!(props.parameter && props.parameter.hasDynamicDateRange) };
  }

  onDynamicValueSelect = (dynamicValue) => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue === 'static') {
      this.setState({ hasDynamicValue: false });
      onSelect(parameter.getValue());
    } else {
      this.setState({ hasDynamicValue: true });
      onSelect(dynamicValue.value);
    }
  };

  onSelect = (value) => {
    const { onSelect } = this.props;
    this.setState({ hasDynamicValue: false }, () => onSelect(value));
  };

  render() {
    const { type, value, parameter, className } = this.props;
    const { hasDynamicValue } = this.state;
    const isDateTimeRange = includes(type, 'datetime-range');
    const options = isDateTimeRange ? DYNAMIC_DATETIME_OPTIONS : DYNAMIC_DATE_OPTIONS;

    const additionalAttributes = {};

    let DateRangeComponent = DateRangeInput;
    if (isDateTimeRange) {
      DateRangeComponent = DateTimeRangeInput;
      if (includes(type, 'with-seconds')) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (isValidDateRangeValue(value)) {
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      additionalAttributes.placeholder = [parameter.dynamicDateRange && parameter.dynamicDateRange.name];
      additionalAttributes.value = null;
    }

    return (
      <DateRangeComponent
        className={classNames('redash-datepicker', { 'dynamic-value hide-end-value': hasDynamicValue }, className)}
        onSelect={this.onSelect}
        suffixIcon={(
          <DynamicButton
            options={options}
            selectedDynamicValue={(hasDynamicValue && isString(parameter.value)) ? parameter.value : null}
            enabled={hasDynamicValue}
            onSelect={this.onDynamicValueSelect}
          />
        )}
        {...additionalAttributes}
      />
    );
  }
}
