import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import { toString } from 'lodash';
import { DateInput } from './DateInput';
import { DateRangeInput } from './DateRangeInput';
import { DateTimeInput } from './DateTimeInput';
import { DateTimeRangeInput } from './DateTimeRangeInput';
import { QueryBasedParameterInput } from './QueryBasedParameterInput';

import './ParameterValueInput.less';

const { Option } = Select;

export class ParameterValueInput extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    enumOptions: PropTypes.string,
    queryId: PropTypes.number,
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    type: 'text',
    value: null,
    enumOptions: '',
    queryId: null,
    parameter: null,
    onSelect: () => {},
    className: '',
  };

  constructor(props) {
    super(props);
    this.state = {
      value: props.value,
      isDirty: false,
    };
  }

  componentDidUpdate = (prevProps) => {
    // if value prop updated, reset dirty state
    if (prevProps.value !== this.props.value) {
      this.setState({ isDirty: false });
    }
  }

  onSelect = (value) => {
    const isDirty = toString(value) !== toString(this.props.value);
    this.setState({ value, isDirty });
    this.props.onSelect(value, isDirty);
  }

  renderDateTimeWithSecondsInput() {
    const { value } = this.props;
    return (
      <DateTimeInput
        className={this.props.className}
        value={value}
        onSelect={this.onSelect}
        withSeconds
      />
    );
  }

  renderDateTimeInput() {
    const { value } = this.props;
    return (
      <DateTimeInput
        className={this.props.className}
        value={value}
        onSelect={this.onSelect}
      />
    );
  }

  renderDateInput() {
    const { value } = this.props;
    return (
      <DateInput
        className={this.props.className}
        value={value}
        onSelect={this.onSelect}
      />
    );
  }

  renderDateTimeRangeWithSecondsInput() {
    const { value } = this.props;
    return (
      <DateTimeRangeInput
        className={this.props.className}
        value={value}
        onSelect={this.onSelect}
        withSeconds
      />
    );
  }

  renderDateTimeRangeInput() {
    const { value } = this.props;
    return (
      <DateTimeRangeInput
        className={this.props.className}
        value={value}
        onSelect={this.onSelect}
      />
    );
  }

  renderDateRangeInput() {
    const { value } = this.props;
    return (
      <DateRangeInput
        className={this.props.className}
        value={value}
        onSelect={this.onSelect}
      />
    );
  }

  renderEnumInput() {
    const { value, enumOptions } = this.props;
    const enumOptionsArray = enumOptions.split('\n').filter(v => v !== '');
    return (
      <Select
        className={this.props.className}
        disabled={enumOptionsArray.length === 0}
        defaultValue={value}
        onChange={this.onSelect}
        dropdownMatchSelectWidth={false}
        dropdownClassName="ant-dropdown-in-bootstrap-modal"
      >
        {enumOptionsArray.map(option => (<Option key={option} value={option}>{ option }</Option>))}
      </Select>
    );
  }

  renderQueryBasedInput() {
    const { queryId, parameter } = this.props;
    const { value } = this.state;
    return (
      <QueryBasedParameterInput
        className={this.props.className}
        parameter={parameter}
        value={value}
        queryId={queryId}
        onSelect={this.onSelect}
      />
    );
  }

  renderNumberInput() {
    const { className } = this.props;
    const { value } = this.state;

    const normalize = val => !isNaN(val) && val || 0;

    return (
      <InputNumber
        className={className}
        value={normalize(value)}
        onChange={val => this.onSelect(normalize(val))}
      />
    );
  }

  renderTextInput() {
    const { className } = this.props;
    const { value } = this.state;

    return (
      <Input
        className={className}
        value={value}
        data-test="TextParamInput"
        onChange={e => this.onSelect(e.target.value)}
      />
    );
  }

  renderInput() {
    switch (this.props.type) {
      case 'datetime-with-seconds': return this.renderDateTimeWithSecondsInput();
      case 'datetime-local': return this.renderDateTimeInput();
      case 'date': return this.renderDateInput();
      case 'datetime-range-with-seconds': return this.renderDateTimeRangeWithSecondsInput();
      case 'datetime-range': return this.renderDateTimeRangeInput();
      case 'date-range': return this.renderDateRangeInput();
      case 'enum': return this.renderEnumInput();
      case 'query': return this.renderQueryBasedInput();
      case 'number': return this.renderNumberInput();
      default: return this.renderTextInput();
    }
  }

  render() {
    const { isDirty } = this.state;

    return (
      <div className="parameter-input" data-dirty={isDirty || null}>
        {this.renderInput()}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('parameterValueInput', {
    template: `
      <parameter-value-input-impl
        type="$ctrl.param.type"
        value="$ctrl.param.normalizedValue"
        parameter="$ctrl.param"
        enum-options="$ctrl.param.enumOptions"
        query-id="$ctrl.param.queryId"
        on-select="$ctrl.setValue"
      ></parameter-value-input-impl>
    `,
    bindings: {
      param: '<',
    },
    controller($scope) {
      this.setValue = (value, isDirty) => {
        if (isDirty) {
          this.param.setPendingValue(value);
        } else {
          this.param.clearPendingValue();
        }
        $scope.$apply();
      };
    },
  });
  ngModule.component('parameterValueInputImpl', react2angular(ParameterValueInput));
}

init.init = true;
