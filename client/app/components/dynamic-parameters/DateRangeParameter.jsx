import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { includes } from 'lodash';
import { DYNAMIC_DATE_RANGES } from '@/services/query';
import { DateRangeInput } from '@/components/DateRangeInput';
import { DateTimeRangeInput } from '@/components/DateTimeRangeInput';
import DynamicButton from '@/components/dynamic-parameters/DynamicButton';

import './DynamicParameters.less';

const DYNAMIC_DATE_OPTIONS = [
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
    this.state = { dynamicValue: !!(props.parameter && props.parameter.hasDynamicValue) };
  }

  dynamicOptions = () => {
    const isDateTimeRange = includes(this.props.type, 'datetime-range');
    const options = isDateTimeRange ? DYNAMIC_DATETIME_OPTIONS : DYNAMIC_DATE_OPTIONS;

    return [
      { name: 'Static value', value: 'static' },
      ...options,
    ];
  }

  onDynamicValueSelect = (dynamicValue) => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue.value === 'static') {
      this.setState({ dynamicValue: false });
      onSelect(parameter.getValue());
    } else {
      this.setState({ dynamicValue: true });
      onSelect(dynamicValue.value);
    }
  };

  onSelect = (value) => {
    const { onSelect } = this.props;
    this.setState({ dynamicValue: false }, () => onSelect(value));
  };

  render() {
    const { type, value, parameter, className } = this.props;
    const { dynamicValue } = this.state;
    const isDateTime = includes(type, 'datetime-range');

    const additionalAttributes = {};

    let DateRangeComponent = DateRangeInput;
    if (isDateTime) {
      DateRangeComponent = DateTimeRangeInput;
      if (includes(type, 'with-seconds')) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (dynamicValue) {
      additionalAttributes.placeholder = [parameter.dynamicValue && parameter.dynamicValue.name];
      additionalAttributes.hideValue = true;
    }

    return (
      <DateRangeComponent
        className={classNames('redash-datepicker', { 'dynamic-value': dynamicValue }, className)}
        value={value}
        onSelect={this.onSelect}
        suffixIcon={(
          <DynamicButton
            options={this.dynamicOptions()}
            enabled={dynamicValue}
            onSelect={this.onDynamicValueSelect}
          />
        )}
        allowClear={false}
        {...additionalAttributes}
      />
    );
  }
}
