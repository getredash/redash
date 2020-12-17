import { find, isArray, get, first, map, intersection, isEqual, isEmpty, trim, debounce, isNil } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import SelectWithVirtualScroll from "@/components/SelectWithVirtualScroll";

const SEARCH_DEBOUNCE_TIME = 300;

function filterValuesThatAreNotInOptions(value, options) {
  if (isArray(value)) {
    const optionValues = map(options, option => option.value);
    return intersection(value, optionValues);
  }
  const found = find(options, option => option.value === value) !== undefined;
  return found ? value : get(first(options), "value");
}

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
    const { mode, parameter } = this.props;

    if (mode === "multiple") {
      if (isNil(value)) {
        value = [];
      }

      value = isArray(value) ? value : [value];
    }

    // parameters with search don't have options available, so we trust what we get
    if (!parameter.searchFunction) {
      value = filterValuesThatAreNotInOptions(value, options);
    }

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
      const options = await this.props.parameter.loadDropdownValues(this.state.currentSearchTerm);

      // stale queryId check
      if (this.props.queryId === queryId) {
        this.updateOptions(options);
      }
    }
  }

  searchFunction = debounce(searchTerm => {
    const { parameter } = this.props;
    if (parameter.searchFunction && trim(searchTerm)) {
      this.setState({ loading: true, currentSearchTerm: searchTerm });
      parameter.searchFunction(searchTerm).then(options => {
        if (this.state.currentSearchTerm === searchTerm) {
          this.updateOptions(options);
        }
      });
    }
  }, SEARCH_DEBOUNCE_TIME);

  render() {
    const { parameter, className, mode, onSelect, queryId, value, ...otherProps } = this.props;
    const { loading, options } = this.state;
    const selectProps = { ...otherProps };

    if (parameter.searchColumn) {
      selectProps.filterOption = false;
      selectProps.onSearch = this.searchFunction;
      selectProps.onChange = value => onSelect(parameter.normalizeValue(value));
      selectProps.notFoundContent = null;
      selectProps.labelInValue = true;
    }
    return (
      <span>
        <SelectWithVirtualScroll
          className={className}
          disabled={!parameter.searchFunction && loading}
          loading={loading}
          mode={mode}
          value={this.state.value || undefined}
          onChange={onSelect}
          options={options}
          optionFilterProp="children"
          showSearch
          showArrow
          notFoundContent={isEmpty(options) ? "No options available" : null}
          {...selectProps}
        />
      </span>
    );
  }
}
