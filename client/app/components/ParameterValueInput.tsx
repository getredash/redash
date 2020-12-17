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
        onSelect: () => { },
        className: "",
    };
    constructor(props: Props) {
        super(props);
        this.state = {
            value: (props as any).parameter.hasPendingValue ? (props as any).parameter.pendingValue : (props as any).value,
            isDirty: (props as any).parameter.hasPendingValue,
        };
    }
    componentDidUpdate = (prevProps: any) => {
        const { value, parameter } = this.props;
        // if value prop updated, reset dirty state
        if (prevProps.value !== value || prevProps.parameter !== parameter) {
            this.setState({
                value: (parameter as any).hasPendingValue ? (parameter as any).pendingValue : value,
                isDirty: (parameter as any).hasPendingValue,
            });
        }
    };
    onSelect = (value: any) => {
        const isDirty = !isEqual(value, (this.props as any).value);
        this.setState({ value, isDirty });
        (this.props as any).onSelect(value, isDirty);
    };
    renderDateParameter() {
        const { type, parameter } = this.props;
        const { value } = this.state;
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
        return (<DateParameter type={type} className={(this.props as any).className} value={value} parameter={parameter} onSelect={this.onSelect}/>);
    }
    renderDateRangeParameter() {
        const { type, parameter } = this.props;
        const { value } = this.state;
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
        return (<DateRangeParameter type={type} className={(this.props as any).className} value={value} parameter={parameter} onSelect={this.onSelect}/>);
    }
    renderEnumInput() {
        const { enumOptions, parameter } = this.props;
        const { value } = this.state;
        const enumOptionsArray = (enumOptions as any).split("\n").filter((v: any) => v !== "");
        // Antd Select doesn't handle null in multiple mode
        const normalize = (val: any) => (parameter as any).multiValuesOptions && val === null ? [] : val;
        // @ts-expect-error ts-migrate(2322) FIXME: Type '"multiple" | "default"' is not assignable to... Remove this comment to see the full error message
        return (<SelectWithVirtualScroll className={(this.props as any).className} mode={(parameter as any).multiValuesOptions ? "multiple" : "default"} optionFilterProp="children" value={normalize(value)} onChange={this.onSelect} options={map(enumOptionsArray, opt => ({ label: String(opt), value: opt }))} showSearch showArrow notFoundContent={isEmpty(enumOptionsArray) ? "No options available" : null} {...multipleValuesProps}/>);
    }
    renderQueryBasedInput() {
        const { queryId, parameter } = this.props;
        const { value } = this.state;
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
        return (<QueryBasedParameterInput className={(this.props as any).className} mode={(parameter as any).multiValuesOptions ? "multiple" : "default"} optionFilterProp="children" parameter={parameter} value={value} queryId={queryId} onSelect={this.onSelect} style={{ minWidth: 60 }} {...multipleValuesProps}/>);
    }
    renderNumberInput() {
        const { className } = this.props;
        const { value } = this.state;
        const normalize = (val: any) => isNaN(val) ? undefined : val;
        return (<InputNumber className={className} value={normalize(value)} onChange={val => this.onSelect(normalize(val))}/>);
    }
    renderTextInput() {
        const { className } = this.props;
        const { value } = this.state;
        return (<Input className={className} value={value} data-test="TextParamInput" onChange={e => this.onSelect(e.target.value)}/>);
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
        return (<div className="parameter-input" data-dirty={isDirty || null} data-test="ParameterValueInput">
        {this.renderInput()}
      </div>);
    }
}
export default ParameterValueInput;
