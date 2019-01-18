import { isEmpty } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import { DateInput } from './DateInput';
import { DateRangeInput } from './DateRangeInput';
import { DateTimeInput } from './DateTimeInput';
import { DateTimeRangeInput } from './DateTimeRangeInput';
import { QueryBasedParameterInput } from './QueryBasedParameterInput';

const { Option } = Select;

export class ParameterValueInput extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    enumOptions: PropTypes.string,
    queryId: PropTypes.number,
    onSelect: PropTypes.func,
    className: PropTypes.string,
    size: PropTypes.string,
  };

  static defaultProps = {
    type: 'text',
    value: null,
    enumOptions: '',
    queryId: null,
    onSelect: () => {},
    className: '',
    size: null,
  };

  renderDateTimeWithSecondsInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <DateTimeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        withSeconds
        clientConfig={clientConfig}
        size={size}
      />
    );
  }

  renderDateTimeInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <DateTimeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
        size={size}
      />
    );
  }

  renderDateInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <DateInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
        size={size}
      />
    );
  }

  renderDateTimeRangeWithSecondsInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <DateTimeRangeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        withSeconds
        clientConfig={clientConfig}
        size={size}
      />
    );
  }

  renderDateTimeRangeInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <DateTimeRangeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
        size={size}
      />
    );
  }

  renderDateRangeInput() {
    const {
      value,
      onSelect,
      clientConfig, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <DateRangeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        clientConfig={clientConfig}
        size={size}
      />
    );
  }

  renderEnumInput() {
    const {
      value, onSelect, enumOptions, size,
    } = this.props;
    const enumOptionsArray = enumOptions.split('\n').filter(v => v !== '');
    return (
      <Select
        className={this.props.className}
        disabled={enumOptionsArray.length === 0}
        defaultValue={value}
        onChange={onSelect}
        dropdownMatchSelectWidth={false}
        dropdownClassName="ant-dropdown-in-bootstrap-modal"
        size={size}
      >
        {enumOptionsArray.map(option => (<Option key={option} value={option}>{ option }</Option>))}
      </Select>
    );
  }

  renderQueryBasedInput() {
    const {
      value,
      onSelect,
      queryId,
      Query, // eslint-disable-line react/prop-types
      size,
    } = this.props;
    return (
      <QueryBasedParameterInput
        className={this.props.className}
        value={value}
        queryId={queryId}
        onSelect={onSelect}
        Query={Query}
        size={size}
      />
    );
  }

  renderTextInput() {
    const {
      value, onSelect, type, size,
    } = this.props;
    return (
      <Input
        size={size}
        type={type}
        className={this.props.className}
        value={isEmpty(value) ? '' : value}
        onChange={event => onSelect(event.target.value)}
        style={{ width: 100 }}
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
