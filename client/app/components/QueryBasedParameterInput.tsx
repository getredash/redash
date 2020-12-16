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
    onSelect: () => {},
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
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'queryId' does not exist on type 'never'.
    this._loadOptions(this.props.queryId);
  }

  componentDidUpdate(prevProps: Props) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'queryId' does not exist on type 'never'.
    if (this.props.queryId !== prevProps.queryId) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'queryId' does not exist on type 'never'.
      this._loadOptions(this.props.queryId);
    }
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'never'.
    if (this.props.value !== prevProps.value) {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'never'.
      this.setValue(this.props.value);
    }
  }

  setValue(value: any) {
    const { options } = this.state;
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'mode' does not exist on type 'never'.
    if (this.props.mode === "multiple") {
      value = isArray(value) ? value : [value];
      const optionValues = map(options, option => option.value);
      const validValues = intersection(value, optionValues);
      this.setState({ value: validValues });
      return validValues;
    }
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'never'.
    const found = find(options, option => option.value === this.props.value) !== undefined;
    value = found ? value : get(first(options), "value");
    this.setState({ value });
    return value;
  }

  async _loadOptions(queryId: any) {
    if (queryId && queryId !== this.state.queryId) {
      this.setState({ loading: true });
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'parameter' does not exist on type 'never... Remove this comment to see the full error message
      const options = await this.props.parameter.loadDropdownValues();

      // stale queryId check
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'queryId' does not exist on type 'never'.
      if (this.props.queryId === queryId) {
        this.setState({ options, loading: false }, () => {
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'never'.
          const updatedValue = this.setValue(this.props.value);
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'never'.
          if (!isEqual(updatedValue, this.props.value)) {
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'onSelect' does not exist on type 'never'... Remove this comment to see the full error message
            this.props.onSelect(updatedValue);
          }
        });
      }
    }
  }

  render() {
    // @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
    const { className, mode, onSelect, queryId, value, ...otherProps } = this.props;
    const { loading, options } = this.state;
    return (
      <span>
        <SelectWithVirtualScroll
          className={className}
          disabled={loading}
          loading={loading}
          mode={mode}
          value={this.state.value}
          onChange={onSelect}
          options={map(options, ({ value, name }) => ({ label: String(name), value }))}
          optionFilterProp="children"
          showSearch
          showArrow
          notFoundContent={isEmpty(options) ? "No options available" : null}
          {...otherProps}
        />
      </span>
    );
  }
}
