import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { react2angular } from 'react2angular';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import { isFunction } from 'lodash';
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

  renderDateTimeWithSecondsInput() {
    const { value, onSelect } = this.props;
    return (
      <DateTimeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        withSeconds
      />
    );
  }

  renderDateTimeInput() {
    const { value, onSelect } = this.props;
    return (
      <DateTimeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
      />
    );
  }

  renderDateInput() {
    const { value, onSelect } = this.props;
    return (
      <DateInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
      />
    );
  }

  renderDateTimeRangeWithSecondsInput() {
    const { value, onSelect } = this.props;
    return (
      <DateTimeRangeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
        withSeconds
      />
    );
  }

  renderDateTimeRangeInput() {
    const { value, onSelect } = this.props;
    return (
      <DateTimeRangeInput
        className={this.props.className}
        value={value}
        onSelect={onSelect}
      />
    );
  }

  renderDateRangeInput() {
    const { value, onSelect } = this.props;
    return (
      <DateRangeInput
        className={this.props.className}
        value={value}
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
      <React.Fragment>
        <InputNumber
          className={classNames('parameter-input', { 'parameter-input--apply-button': showApplyButton }, className)}
          value={!isNaN(value) && value || 0}
          onChange={onChange}
          onKeyUp={showApplyButton ? (e) => {
            const keyNumber = e.which || e.keyCode;
            if (keyNumber === 13) { // enter key
              onSelect(value);
            }
          } : null}
        />
        {showApplyButton && this.renderApplyButton()}
      </React.Fragment>
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
      <React.Fragment>
        <Input
          className={classNames('parameter-input', { 'parameter-input--apply-button': showApplyButton }, className)}
          value={value || ''}
          data-test="TextParamInput"
          onChange={onChange}
          onPressEnter={showApplyButton ? () => onSelect(value) : null}
        />
        {showApplyButton && this.renderApplyButton()}
      </React.Fragment>
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
        if (isFunction(this.onChange)) {
          this.onChange();
        }
        $scope.$applyAsync();
      };
    },
  });
  ngModule.component('parameterValueInputImpl', react2angular(ParameterValueInput));
}

init.init = true;
