import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
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
    this.state = { dynamicValue: !!(props.parameter && props.parameter.hasDynamicValue) };
  }

  onDynamicValueSelect = (dynamicValue) => {
    const { onSelect, parameter } = this.props;
    if (dynamicValue === 'static') {
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
    const isDateTime = includes(type, 'datetime');

    const additionalAttributes = {};

    let DateComponent = DateInput;
    if (isDateTime) {
      DateComponent = DateTimeInput;
      if (includes(type, 'with-seconds')) {
        additionalAttributes.withSeconds = true;
      }
    }

    if (dynamicValue) {
      additionalAttributes.placeholder = parameter.dynamicValue && parameter.dynamicValue.name;
    }

    return (
      <DateComponent
        className={classNames('redash-datepicker', { 'dynamic-value': dynamicValue }, className)}
        value={dynamicValue ? null : value}
        onSelect={this.onSelect}
        suffixIcon={(
          <DynamicButton
            options={DYNAMIC_DATE_OPTIONS}
            selectedDynamicValue={dynamicValue ? parameter.value : null}
            enabled={dynamicValue}
            onSelect={this.onDynamicValueSelect}
          />
        )}
        {...additionalAttributes}
      />
    );
  }
}
