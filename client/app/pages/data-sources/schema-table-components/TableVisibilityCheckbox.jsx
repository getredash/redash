import React from "react";
import PropTypes from "prop-types";
import Checkbox from "antd/lib/checkbox";

export default class TableVisibilityCheckbox extends React.PureComponent {
  static propTypes = {
    visible: PropTypes.bool.isRequired,
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
  };

  static defaultProps = {
    disabled: false,
    onChange: undefined,
  };

  render() {
    return (
      <Checkbox checked={this.props.visible} onChange={this.props.onChange} disabled={this.props.disabled}>
        {this.props.visible ? "Visible" : "Hidden"}
      </Checkbox>
    );
  }
}
