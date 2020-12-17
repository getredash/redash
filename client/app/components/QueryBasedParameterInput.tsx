import { find, isArray, get, first, map, intersection, isEqual, isEmpty } from "lodash";
import React from "react";
import SelectWithVirtualScroll from "@/components/SelectWithVirtualScroll";
type OwnProps = {
    parameter?: any;
    value?: any;
    mode?: "default" | "multiple";
    queryId?: number;
    onSelect?: (...args: any[]) => any;
    className?: string;
};
type State = any;
type Props = OwnProps & typeof QueryBasedParameterInput.defaultProps;
export default class QueryBasedParameterInput extends React.Component<Props, State> {
    static defaultProps = {
        value: null,
        mode: "default",
        parameter: null,
        queryId: null,
        onSelect: () => { },
        className: "",
    };
    constructor(props: Props) {
        super(props);
        this.state = {
            options: [],
            value: null,
            loading: false,
        };
    }
    componentDidMount() {
        this._loadOptions((this.props as any).queryId);
    }
    componentDidUpdate(prevProps: Props) {
        if ((this.props as any).queryId !== (prevProps as any).queryId) {
            this._loadOptions((this.props as any).queryId);
        }
        if ((this.props as any).value !== (prevProps as any).value) {
            this.setValue((this.props as any).value);
        }
    }
    setValue(value: any) {
        const { options } = this.state;
        if ((this.props as any).mode === "multiple") {
            value = isArray(value) ? value : [value];
            const optionValues = map(options, option => option.value);
            const validValues = intersection(value, optionValues);
            this.setState({ value: validValues });
            return validValues;
        }
        const found = find(options, option => option.value === (this.props as any).value) !== undefined;
        value = found ? value : get(first(options), "value");
        this.setState({ value });
        return value;
    }
    async _loadOptions(queryId: any) {
        if (queryId && queryId !== this.state.queryId) {
            this.setState({ loading: true });
            const options = await (this.props as any).parameter.loadDropdownValues();
            // stale queryId check
            if ((this.props as any).queryId === queryId) {
                this.setState({ options, loading: false }, () => {
                    const updatedValue = this.setValue((this.props as any).value);
                    if (!isEqual(updatedValue, (this.props as any).value)) {
                        (this.props as any).onSelect(updatedValue);
                    }
                });
            }
        }
    }
    render() {
        // @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
        const { className, mode, onSelect, queryId, value, ...otherProps } = this.props;
        const { loading, options } = this.state;
        return (<span>
        <SelectWithVirtualScroll className={className} disabled={loading} loading={loading} mode={mode} value={this.state.value} onChange={onSelect} options={map(options, ({ value, name }) => ({ label: String(name), value }))} optionFilterProp="children" showSearch showArrow notFoundContent={isEmpty(options) ? "No options available" : null} {...otherProps}/>
      </span>);
    }
}
