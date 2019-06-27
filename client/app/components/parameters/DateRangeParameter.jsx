import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DYNAMIC_DATE_RANGES } from '@/services/query';
import { DateRangeInput } from '@/components/DateRangeInput';
import DynamicButton from '@/components/parameters/DynamicButton';

import './DateRangeParameter.less';

const DYNAMIC_OPTIONS = [
  { name: 'Static value', value: 'static' },
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

export default class DateRangeParameter extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    onSelect: PropTypes.func,
  };

  static defaultProps = {
    className: '',
    value: null,
    parameter: null,
    onSelect: () => {},
  };

  constructor(props) {
    super(props);
    this.state = { dynamicValue: !!(props.parameter && props.parameter.hasDynamicValue) };
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
    const { value, parameter, className } = this.props;
    const { dynamicValue } = this.state;

    const additionalAttributes = {};

    if (dynamicValue) {
      additionalAttributes.placeholder = [parameter.dynamicValue && parameter.dynamicValue.name];
      additionalAttributes.hideValue = true;
    }

    return (
      <DateRangeInput
        className={classNames('redash-datepicker', { 'dynamic-value': dynamicValue }, className)}
        value={value}
        onSelect={this.onSelect}
        suffixIcon={(
          <DynamicButton
            options={DYNAMIC_OPTIONS}
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
