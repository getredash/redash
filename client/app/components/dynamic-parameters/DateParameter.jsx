import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import moment from 'moment';
import { includes } from 'lodash';
import { DYNAMIC_DATES } from '@/services/query';
import { DateInput } from '@/components/DateInput';
import { DateTimeInput } from '@/components/DateTimeInput';
import DynamicButton from '@/components/dynamic-parameters/DynamicButton';

import './DynamicParameters.less';

const DYNAMIC_DATE_OPTIONS = [
  { name: 'Today/Now',
    value: 'd_now',
    label: () => DYNAMIC_DATES.now.value().format('MMM D') },
  { name: 'Yesterday',
    value: 'd_yesterday',
    label: () => DYNAMIC_DATES.yesterday.value().format('MMM D') },
];

export default class DateParameter extends React.Component {
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
    this.state = { hasDynamicValue: !!(props.parameter && props.parameter.hasDynamicDate) };
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
    const isDateTime = includes(type, 'datetime');

    const additionalAttributes = {};

    let DateComponent = DateInput;
    if (isDateTime) {
      DateComponent = DateTimeInput;
      if (includes(type, 'with-seconds')) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (moment.isMoment(value) || value === null) {
      additionalAttributes.value = value;
    }

    if (hasDynamicValue) {
      additionalAttributes.placeholder = parameter.dynamicDate && parameter.dynamicDate.name;
      additionalAttributes.value = null;
    }

    return (
      <DateComponent
        className={classNames('redash-datepicker', { 'dynamic-value': hasDynamicValue }, className)}
        onSelect={this.onSelect}
        suffixIcon={(
          <DynamicButton
            options={DYNAMIC_DATE_OPTIONS}
            selectedDynamicValue={hasDynamicValue ? parameter.value : null}
            enabled={hasDynamicValue}
            onSelect={this.onDynamicValueSelect}
          />
        )}
        {...additionalAttributes}
      />
    );
  }
}
