import { isEqual, isEmpty, map } from "lodash";
import React from "react";
import SelectWithVirtualScroll from "@/components/SelectWithVirtualScroll";
import Input from "antd/lib/input";
import InputNumber from "antd/lib/input-number";
import DateParameter from "@/components/dynamic-parameters/DateParameter";
import DateRangeParameter from "@/components/dynamic-parameters/DateRangeParameter";
import QueryBasedParameterInput from "./QueryBasedParameterInput";

import "./ParameterValueInput.less";

const multipleValuesProps = {
  maxTagCount: 3,
  maxTagTextLength: 10,
  maxTagPlaceholder: (num: any) => `+${num.length} more`,
};

type OwnProps = {
    type?: string;
    value?: any;
    enumOptions?: string;
    queryId?: number;
    parameter?: any;
    onSelect?: (...args: any[]) => any;
    className?: string;
};

type State = any;

type Props = OwnProps & typeof ParameterValueInput.defaultProps;

class ParameterValueInput extends React.Component<Props, State> {

  static defaultProps = {
    type: "text",
    value: null,
    enumOptions: "",
    queryId: null,
    parameter: null,
    onSelect: () => {},
    className: "",
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'parameter' does not exist on type 'never... Remove this comment to see the full error message
      value: props.parameter.hasPendingValue ? props.parameter.pendingValue : props.value,
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'parameter' does not exist on type 'never... Remove this comment to see the full error message
      isDirty: props.parameter.hasPendingValue,
    };
  }

  componentDidUpdate = (prevProps: any) => {
    const { value, parameter } = this.props;
    // if value prop updated, reset dirty state
    if (prevProps.value !== value || prevProps.parameter !== parameter) {
      this.setState({
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'hasPendingValue' does not exist on type ... Remove this comment to see the full error message
        value: parameter.hasPendingValue ? parameter.pendingValue : value,
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'hasPendingValue' does not exist on type ... Remove this comment to see the full error message
        isDirty: parameter.hasPendingValue,
      });
    }
  };

  onSelect = (value: any) => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'never'.
    const isDirty = !isEqual(value, this.props.value);
    this.setState({ value, isDirty });
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onSelect' does not exist on type 'never'... Remove this comment to see the full error message
    this.props.onSelect(value, isDirty);
  };

  renderDateParameter() {
    const { type, parameter } = this.props;
    const { value } = this.state;
    return (
      <DateParameter
        type={type}
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'className' does not exist on type 'never... Remove this comment to see the full error message
        className={this.props.className}
        value={value}
        parameter={parameter}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
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
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'className' does not exist on type 'never... Remove this comment to see the full error message
        className={this.props.className}
        value={value}
        parameter={parameter}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
        onSelect={this.onSelect}
      />
    );
  }

  renderEnumInput() {
    const { enumOptions, parameter } = this.props;
    const { value } = this.state;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'split' does not exist on type 'never'.
    const enumOptionsArray = enumOptions.split("\n").filter((v: any) => v !== "");
    // Antd Select doesn't handle null in multiple mode
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'multiValuesOptions' does not exist on ty... Remove this comment to see the full error message
    const normalize = (val: any) => parameter.multiValuesOptions && val === null ? [] : val;

    return (
      <SelectWithVirtualScroll
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'className' does not exist on type 'never... Remove this comment to see the full error message
        className={this.props.className}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '"multiple" | "default"' is not assignable to... Remove this comment to see the full error message
        mode={parameter.multiValuesOptions ? "multiple" : "default"}
        optionFilterProp="children"
        value={normalize(value)}
        onChange={this.onSelect}
        options={map(enumOptionsArray, opt => ({ label: String(opt), value: opt }))}
        showSearch
        showArrow
        notFoundContent={isEmpty(enumOptionsArray) ? "No options available" : null}
        {...multipleValuesProps}
      />
    );
  }

  renderQueryBasedInput() {
    const { queryId, parameter } = this.props;
    const { value } = this.state;
    return (
      <QueryBasedParameterInput
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
        className={this.props.className}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
        mode={parameter.multiValuesOptions ? "multiple" : "default"}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
        optionFilterProp="children"
        parameter={parameter}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
        value={value}
        queryId={queryId}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
        onSelect={this.onSelect}
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'number' is not assignable to type 'never'.
        style={{ minWidth: 60 }}
        {...multipleValuesProps}
      />
    );
  }

  renderNumberInput() {
    const { className } = this.props;
    const { value } = this.state;

    const normalize = (val: any) => isNaN(val) ? undefined : val;

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
