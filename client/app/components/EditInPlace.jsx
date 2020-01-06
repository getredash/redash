import { trim } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Input from "antd/lib/input";

export default class EditInPlace extends React.Component {
  static propTypes = {
    ignoreBlanks: PropTypes.bool,
    isEditable: PropTypes.bool,
    placeholder: PropTypes.string,
    value: PropTypes.string,
    onDone: PropTypes.func.isRequired,
    multiline: PropTypes.bool,
    editorProps: PropTypes.object,
  };

  static defaultProps = {
    ignoreBlanks: false,
    isEditable: true,
    placeholder: "",
    value: "",
    multiline: false,
    editorProps: {},
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
    const { multiline, value, editorProps } = this.props;
    const InputComponent = multiline ? Input.TextArea : Input;
    return (
      <InputComponent
        ref={this.inputRef}
        defaultValue={value}
        onBlur={e => this.stopEditing(e.target.value)}
        onKeyDown={this.handleKeyDown}
        {...editorProps}
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
