import { isNull, isUndefined } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { DateInput } from './DateInput';
import { DateRangeInput } from './DateRangeInput';
import { DateTimeInput } from './DateTimeInput';
import { DateTimeRangeInput } from './DateTimeRangeInput';
import { QueryBasedParameterInput } from './QueryBasedParameterInput';

export class ParameterValueInput extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    enumOptions: PropTypes.string,
    queryId: PropTypes.number,
    onSelect: PropTypes.func,
  };

  static defaultProps = {
    type: 'text',
    value: null,
    enumOptions: '',
    queryId: null,
    onSelect: () => {},
  };

  renderDateTimeWithSecondsInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <DateTimeInput
        value={value}
        onSelect={onSelect}
        withSeconds
        clientConfig={clientConfig}
      />
    );
  }

  renderDateTimeInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <DateTimeInput
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
      />
    );
  }

  renderDateInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <DateInput
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
      />
    );
  }

  renderDateTimeRangeWithSecondsInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <DateTimeRangeInput
        value={value}
        onSelect={onSelect}
        withSeconds
        clientConfig={clientConfig}
      />
    );
  }

  renderDateTimeRangeInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <DateTimeRangeInput
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
      />
    );
  }

  renderDateRangeInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <DateRangeInput
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
      />
    );
  }

  renderEnumInput() {
    const { value, onSelect, enumOptions } = this.props;
    const enumOptionsArray = enumOptions.split('\n');
    return (
      <select
        className="form-control"
        value={isNull(value) || isUndefined(value) ? '' : value}
        onChange={event => onSelect(event.target.value)}
      >
        {enumOptionsArray.map(option => (
          <option value={option} key={option}>{ option }</option>
        ))}
      </select>
    );
  }

  renderQueryBasedInput() {
    const {
      value,
      onSelect,
      queryId,
      Query, // eslint-disable-line react/prop-types
    } = this.props;
    return (
      <QueryBasedParameterInput
        value={value}
        queryId={queryId}
        onSelect={onSelect}
        Query={Query}
      />
    );
  }

  renderTextInput() {
    const { value, onSelect, type } = this.props;
    return (
      <input
        type={type}
        className="form-control"
        value={isNull(value) || isUndefined(value) ? '' : value}
        onChange={event => onSelect(event.target.value)}
      />
    );
  }

  render() {
    const { type } = this.props;
    switch (type) {
      case 'datetime-with-seconds': return this.renderDateTimeWithSecondsInput();
      case 'datetime-local': return this.renderDateTimeInput();
      case 'date': return this.renderDateInput();
      case 'datetime-range-with-seconds': return this.renderDateTimeRangeWithSecondsInput();
      case 'datetime-range': return this.renderDateTimeRangeInput();
      case 'date-range': return this.renderDateRangeInput();
      case 'enum': return this.renderEnumInput();
      case 'query': return this.renderQueryBasedInput();
      default: return this.renderTextInput();
    }
  }
}

export default function init(ngModule) {
  ngModule.component('parameterValueInput', {
    template: `
      <parameter-value-input-impl 
        type="$ctrl.param.type"       
        value="$ctrl.param.normalizedValue"       
        enum-options="$ctrl.param.enumOptions"       
        query-id="$ctrl.param.queryId"
        on-select="$ctrl.setValue"       
      ></parameter-value-input-impl>
    `,
    bindings: {
      param: '<',
    },
    controller($scope) {
      this.setValue = (value) => {
        this.param.setValue(value);
        $scope.$applyAsync();
      };
    },
  });
  ngModule.component(
    'parameterValueInputImpl',
    react2angular(ParameterValueInput, null, ['clientConfig', 'Query']),
  );
}

init.init = true;
