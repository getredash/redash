import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { react2angular } from "react2angular";
import { trim } from "lodash";
import Input from "antd/lib/input";

export class EditInPlace extends React.Component {
  static propTypes = {
    ignoreBlanks: PropTypes.bool,
    isEditable: PropTypes.bool,
    placeholder: PropTypes.string,
    value: PropTypes.string,
    onDone: PropTypes.func.isRequired,
    textArea: PropTypes.bool,
  };

  static defaultProps = {
    ignoreBlanks: false,
    isEditable: true,
    placeholder: "",
    value: "",
    textArea: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      editing: false,
    };
    this.inputRef = React.createRef();
  }

  componentDidUpdate(_, prevState) {
    if (this.state.editing && !prevState.editing) {
      this.inputRef.current.focus();
    }
  }

  startEditing = () => {
    if (this.props.isEditable) {
      this.setState({ editing: true });
    }
  };

  stopEditing = currentValue => {
    const newValue = trim(currentValue);
    const ignorableBlank = this.props.ignoreBlanks && newValue === "";
    if (!ignorableBlank && newValue !== this.props.value) {
      this.props.onDone(newValue);
    }
    this.setState({ editing: false });
  };

  handleKeyDown = event => {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      this.stopEditing(event.target.value);
    } else if (event.keyCode === 27) {
      this.setState({ editing: false });
    }
  };

  renderNormal = () => (
    <span
      role="presentation"
      onFocus={this.startEditing}
      onClick={this.startEditing}
      className={this.props.isEditable ? "editable" : ""}>
      {this.props.value || this.props.placeholder}
    </span>
  );

  renderEdit = () => {
    const InputComponent = this.props.textArea ? Input.TextArea : Input;
    return (
      <InputComponent
        ref={this.inputRef}
        defaultValue={this.props.value}
        onBlur={e => this.stopEditing(e.target.value)}
        onKeyDown={this.handleKeyDown}
      />
    );
  };

  render() {
    return (
      <span className={cx("edit-in-place", { active: this.state.editing }, this.props.className)}>
        {this.state.editing ? this.renderEdit() : this.renderNormal()}
      </span>
    );
  }
}

export default function init(ngModule) {
  ngModule.component("editInPlace", react2angular(EditInPlace));
}

init.init = true;
