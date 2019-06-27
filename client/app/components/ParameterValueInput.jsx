import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import DateParameter from '@/components/dynamic-parameters/DateParameter';
import DateRangeParameter from '@/components/dynamic-parameters/DateRangeParameter';
import { defer, isFunction } from 'lodash';
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
    applyButton: PropTypes.bool,
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    type: 'text',
    value: null,
    enumOptions: '',
    queryId: null,
    parameter: null,
    applyButton: false,
    onSelect: () => {},
    className: '',
  };

  constructor(props) {
    super(props);
    this.state = { value: props.value };
  }

  renderApplyButton() {
    const { onSelect } = this.props;
    const { value } = this.state;
    return (
      <Button
        className="parameter-apply-button"
        type="primary"
        size="small"
        onClick={() => onSelect(value)}
      >
        Apply
      </Button>
    );
  }

  renderDateParameter() {
    const { type, value, parameter, onSelect } = this.props;
    return (
      <DateParameter
        type={type}
        className={this.props.className}
        value={value}
        parameter={parameter}
        onSelect={onSelect}
      />
    );
  }

  renderDateRangeParameter() {
    const { type, value, parameter, onSelect } = this.props;
    return (
      <DateRangeParameter
        type={type}
        className={this.props.className}
        value={value}
        parameter={parameter}
        onSelect={onSelect}
      />
    );
  }

  renderEnumInput() {
    const { value, onSelect, enumOptions } = this.props;
    const enumOptionsArray = enumOptions.split('\n').filter(v => v !== '');
    return (
      <Select
        className={this.props.className}
        disabled={enumOptionsArray.length === 0}
        defaultValue={value}
        onChange={onSelect}
        dropdownMatchSelectWidth={false}
        dropdownClassName="ant-dropdown-in-bootstrap-modal"
      >
        {enumOptionsArray.map(option => (<Option key={option} value={option}>{ option }</Option>))}
      </Select>
    );
  }

  renderQueryBasedInput() {
    const { value, onSelect, queryId, parameter } = this.props;
    return (
      <QueryBasedParameterInput
        className={this.props.className}
        parameter={parameter}
        value={value}
        queryId={queryId}
        onSelect={onSelect}
      />
    );
  }

  renderNumberInput() {
    const { className, onSelect, applyButton } = this.props;
    const { value } = this.state;
    const showApplyButton = applyButton && value !== this.props.value;

    const onChange = (newValue) => {
      this.setState({ value: newValue });
      if (!applyButton) {
        onSelect(newValue);
      }
    };

    return (
      <div className="parameter-input-number" data-dirty={showApplyButton || null}>
        <InputNumber
          className={className}
          value={!isNaN(value) && value || 0}
          onChange={onChange}
          onKeyUp={showApplyButton ? (e) => {
            const keyNumber = e.which || e.keyCode;
            if (keyNumber === 13 && !e.ctrlKey && !e.metaKey) { // enter key
              onSelect(value);
            }
          } : null}
        />
        {showApplyButton && this.renderApplyButton()}
      </div>
    );
  }

  renderTextInput() {
    const { className, onSelect, applyButton } = this.props;
    const { value } = this.state;
    const showApplyButton = applyButton && value !== this.props.value;

    const onChange = (event) => {
      this.setState({ value: event.target.value });
      if (!applyButton) {
        onSelect(event.target.value);
      }
    };

    return (
      <div className="parameter-input" data-dirty={showApplyButton || null}>
        <Input
          className={className}
          value={value || ''}
          data-test="TextParamInput"
          onChange={onChange}
          onPressEnter={showApplyButton ? (e) => {
            if (!e.ctrlKey && !e.metaKey) {
              onSelect(value);
            }
          } : null}
        />
        {showApplyButton && this.renderApplyButton()}
      </div>
    );
  }

  render() {
    const { type } = this.props;
    switch (type) {
      case 'datetime-with-seconds': return this.renderDateParameter();
      case 'datetime-local': return this.renderDateParameter();
      case 'date': return this.renderDateParameter();
      case 'datetime-range-with-seconds': return this.renderDateRangeParameter();
      case 'datetime-range': return this.renderDateRangeParameter();
      case 'date-range': return this.renderDateRangeParameter();
      case 'enum': return this.renderEnumInput();
      case 'query': return this.renderQueryBasedInput();
      case 'number': return this.renderNumberInput();
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
        parameter="$ctrl.param"
        enum-options="$ctrl.param.enumOptions"
        query-id="$ctrl.param.queryId"
        on-select="$ctrl.setValue"
        apply-button="$ctrl.applyButton"
      ></parameter-value-input-impl>
    `,
    bindings: {
      param: '<',
      applyButton: '=?',
      onChange: '=',
    },
    controller($scope) {
      this.setValue = (value) => {
        this.param.setValue(value);
        defer(() => {
          $scope.$apply();
          if (isFunction(this.onChange)) {
            this.onChange();
          }
        });
      };
    },
  });
  ngModule.component('parameterValueInputImpl', react2angular(ParameterValueInput));
}

init.init = true;
