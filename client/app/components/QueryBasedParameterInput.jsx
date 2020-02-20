import { debounce, find, isArray, get, first, map, trim, intersection, isEqual } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Select from "antd/lib/select";

const { Option } = Select;

export default class QueryBasedParameterInput extends React.Component {
  static propTypes = {
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    mode: PropTypes.oneOf(["default", "multiple"]),
    queryId: PropTypes.number,
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    value: null,
    mode: "default",
    parameter: null,
    queryId: null,
    onSelect: () => {},
    className: "",
  };

  constructor(props) {
    super(props);
    this.state = {
      options: [],
      value: null,
      loading: false,
      currentSearchTerm: null,
    };
  }

  componentDidMount() {
    this._loadOptions(this.props.queryId);
  }

  componentDidUpdate(prevProps) {
    if (this.props.queryId !== prevProps.queryId || this.props.parameter !== prevProps.parameter) {
      this._loadOptions(this.props.queryId);
    }

    if (this.props.value !== prevProps.value) {
      this.setValue(this.props.value);
    }
  }

  setValue(value) {
    const { options } = this.state;
    if (this.props.mode === "multiple") {
      value = isArray(value) ? value : [value];
      const optionValues = map(options, option => option.value);
      const validValues = intersection(value, optionValues);
      this.setState({ value: validValues });
      return validValues;
    }
    const found = find(options, option => option.value === this.props.value) !== undefined;
    value = found ? value : get(first(options), "value");
    this.setState({ value });
    return value;
  }

  updateOptions(options) {
    this.setState({ options, loading: false }, () => {
      const updatedValue = this.setValue(this.props.value);
      if (!isEqual(updatedValue, this.props.value)) {
        this.props.onSelect(updatedValue);
      }
    });
  }

  async _loadOptions(queryId) {
    if (queryId && queryId !== this.state.queryId) {
      this.setState({ loading: true });
      const options = await this.props.parameter.loadDropdownValues();

      // stale queryId check
      if (this.props.queryId === queryId) {
        this.updateOptions(options);
      }
    }
  }

  render() {
    const { parameter, className, value, mode, onSelect, ...otherProps } = this.props;
    const { loading, options } = this.state;
    const selectProps = { ...otherProps };
    if (parameter.searchFunction) {
      selectProps.filterOption = false;
      selectProps.onSearch = debounce(searchTerm => {
        if (trim(searchTerm)) {
          this.setState({ loading: true, currentSearchTerm: searchTerm });
          parameter.searchFunction(searchTerm).then(options => {
            if (this.state.currentSearchTerm === searchTerm) {
              this.updateOptions(options);
            }
          });
        }
      }, 300);
    }
    return (
      <span>
        <Select
          className={className}
          disabled={!parameter.searchFunction && (loading || options.length === 0)}
          loading={loading}
          mode={mode}
          value={this.state.value}
          onChange={onSelect}
          dropdownMatchSelectWidth={false}
          optionFilterProp="children"
          showSearch
          showArrow
          notFoundContent={null}
          {...selectProps}>
          {options.map(option => (
            <Option value={option.value} key={option.value}>
              {option.name}
            </Option>
          ))}
        </Select>
      </span>
    );
  }
}
