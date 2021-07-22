import { find, isArray, get, first, map, intersection, isEqual, isEmpty } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import SelectWithVirtualScroll from "@/components/SelectWithVirtualScroll";
import { connect } from "react-redux";
import { getQueryAction } from "@/store";

class QueryBasedParameterInput extends React.Component {
  static propTypes = {
    parameter: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
    mode: PropTypes.oneOf(["default", "multiple"]),
    queryId: PropTypes.number,
    queryResult: PropTypes.any,
    onSelect: PropTypes.func,
    className: PropTypes.string,
  };

  static defaultProps = {
    value: null,
    mode: "default",
    parameter: null,
    queryId: null,
    queryResult: null,
    onSelect: () => {},
    className: "",
  };

  constructor(props) {
    super(props);
    this.state = {
      options: [],
      value: null,
      loading: false,
    };
  }

  componentDidMount() {
    this._loadOptions(this.props.queryId);
  }

  componentDidUpdate(prevProps) {
    if (this.props.queryId !== prevProps.queryId) {
      this._loadOptions(this.props.queryId);
    }
    if (this.props.value !== prevProps.value) {
      this.setValue(this.props.value);
      this._loadOptions(this.props.queryId, this.props.queryResult);
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

  async _loadOptions(queryId, queryResult) {
    if (queryId && queryId !== this.state.queryId) {
      this.setState({ loading: true });

      let options = await this.props.parameter.loadDropdownValues();
      const arr = [];
      const visualArr = [];

      // Pushing type of visualization to visualArr
      this.props.widgets.forEach(widget => {
        if (widget.visualization && !visualArr.includes(widget.visualization.type)) {
          visualArr.push(widget.visualization.type);
        }
      });

      // Check if there is a query result and the visualArr has a selection table. If so then filter out dropdown options.
      if (queryResult?.length >= 1 && visualArr.includes("SELECTION_TABLE")) {
        queryResult.forEach(obj => {
          if (!arr.includes(obj[this.props.parameter.title])) {
            arr.push(obj[this.props.parameter.title]);
          }
        });
        options = options.filter(option => arr.includes(option.name));
      }

      // stale queryId check
      if (this.props.queryId === queryId) {
        this.setState({ options, loading: false }, () => {
          const updatedValue = this.setValue(this.props.value);
          if (!isEqual(updatedValue, this.props.value)) {
            this.props.onSelect(updatedValue);
          }
        });
      }
    }
  }

  render() {
    const { className, mode, onSelect, queryId, value, queryResult, ...otherProps } = this.props;
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
          showSearch
          showArrow
          notFoundContent={isEmpty(options) ? "No options available" : null}
          {...otherProps}
        />
      </span>
    );
  }
}

function mapStateToProps(state) {
  const { QueryData } = state;
  return { queryResult: QueryData.Data };
}

const mapDispatchToProps = () => {
  return {
    getqueryaction: getQueryAction(),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(QueryBasedParameterInput);
