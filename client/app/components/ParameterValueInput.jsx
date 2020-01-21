import { isEqual } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Select from "antd/lib/select";
import Input from "antd/lib/input";
import InputNumber from "antd/lib/input-number";
import DateParameter from "@/components/dynamic-parameters/DateParameter";
import DateRangeParameter from "@/components/dynamic-parameters/DateRangeParameter";
import QueryBasedParameterInput from "./QueryBasedParameterInput";

import "./ParameterValueInput.less";

const { Option } = Select;

const multipleValuesProps = {
  maxTagCount: 3,
  maxTagTextLength: 10,
  maxTagPlaceholder: num => `+${num.length} more`,
};

class ParameterValueInput extends React.Component {
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
    type: "text",
    value: null,
    enumOptions: "",
    queryId: null,
    parameter: null,
    onSelect: () => {},
    className: "",
  };

  constructor(props) {
    super(props);
    this.state = {
      value: props.parameter.hasPendingValue ? props.parameter.pendingValue : props.value,
      isDirty: props.parameter.hasPendingValue,
    };
  }

  componentDidUpdate = prevProps => {
    const { value, parameter } = this.props;
    // if value prop updated, reset dirty state
    if (prevProps.value !== value || prevProps.parameter !== parameter) {
      this.setState({
        value: parameter.hasPendingValue ? parameter.pendingValue : value,
        isDirty: parameter.hasPendingValue,
      });
    }
  };

  onSelect = value => {
    const isDirty = !isEqual(value, this.props.value);
    this.setState({ value, isDirty });
    this.props.onSelect(value, isDirty);
  };

  renderDateParameter() {
    const { type, parameter } = this.props;
    const { value } = this.state;
    return (
      <DateParameter
        type={type}
        className={this.props.className}
        value={value}
        parameter={parameter}
        onSelect={this.onSelect}
      />
    );
  }

  renderDateRangeParameter() {
    const { type, parameter } = this.props;
    const { value } = this.state;
    return (
      <DateRangeParameter
        type={type}
        className={this.props.className}
        value={value}
        parameter={parameter}
        onSelect={this.onSelect}
      />
    );
  }

  renderEnumInput() {
    const { enumOptions, parameter } = this.props;
    const { value } = this.state;
    const enumOptionsArray = enumOptions.split("\n").filter(v => v !== "");
    // Antd Select doesn't handle null in multiple mode
    const normalize = val => (parameter.multiValuesOptions && val === null ? [] : val);
    return (
      <Select
        className={this.props.className}
        mode={parameter.multiValuesOptions ? "multiple" : "default"}
        optionFilterProp="children"
        disabled={enumOptionsArray.length === 0}
        value={normalize(value)}
        onChange={this.onSelect}
        dropdownMatchSelectWidth={false}
        showSearch
        showArrow
        style={{ minWidth: 60 }}
        notFoundContent={null}
        {...multipleValuesProps}>
        {enumOptionsArray.map(option => (
          <Option key={option} value={option}>
            {option}
          </Option>
        ))}
      </Select>
    );
  }

  renderQueryBasedInput() {
    const { queryId, parameter } = this.props;
    const { value } = this.state;
    return (
      <QueryBasedParameterInput
        className={this.props.className}
        mode={parameter.multiValuesOptions ? "multiple" : "default"}
        optionFilterProp="children"
        parameter={parameter}
        value={value}
        queryId={queryId}
        onSelect={this.onSelect}
        style={{ minWidth: 60 }}
        {...multipleValuesProps}
      />
    );
  }

  renderNumberInput() {
    const { className } = this.props;
    const { value } = this.state;

    const normalize = val => (isNaN(val) ? undefined : val);

    return (
      <InputNumber className={className} value={normalize(value)} onChange={val => this.onSelect(normalize(val))} />
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
    const { type } = this.props;
    switch (type) {
      case "datetime-with-seconds":
      case "datetime-local":
      case "date":
        return this.renderDateParameter();
      case "datetime-range-with-seconds":
      case "datetime-range":
      case "date-range":
        return this.renderDateRangeParameter();
      case "enum":
        return this.renderEnumInput();
      case "query":
        return this.renderQueryBasedInput();
      case "number":
        return this.renderNumberInput();
      default:
        return this.renderTextInput();
    }
  }

  render() {
    const { isDirty } = this.state;

    return (
      <div className="parameter-input" data-dirty={isDirty || null} data-test="ParameterValueInput">
        {this.renderInput()}
      </div>
    );
  }
}

export default ParameterValueInput;
