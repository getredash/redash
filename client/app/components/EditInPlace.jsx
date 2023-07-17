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
    onStopEditing: PropTypes.func,
    multiline: PropTypes.bool,
    editorProps: PropTypes.object,
    defaultEditing: PropTypes.bool,
  };

  static defaultProps = {
    ignoreBlanks: false,
    isEditable: true,
    placeholder: "",
    value: "",
    onStopEditing: () => {},
    multiline: false,
    editorProps: {},
    defaultEditing: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      editing: props.defaultEditing,
    };
  }

  componentDidUpdate(_, prevState) {
    if (!this.state.editing && prevState.editing) {
      this.props.onStopEditing();
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

  renderNormal = () =>
    this.props.value ? (
      <span
        role="presentation"
        onFocus={this.startEditing}
        onClick={this.startEditing}
        className={this.props.isEditable ? "editable" : ""}>
        {this.props.value}
      </span>
    ) : (
      <a className="clickable" onClick={this.startEditing}>
        {this.props.placeholder}
      </a>
    );

  renderEdit = () => {
    const { multiline, value, editorProps } = this.props;
    const InputComponent = multiline ? Input.TextArea : Input;
    return (
      <InputComponent
        defaultValue={value}
        aria-label="Editing"
        onBlur={e => this.stopEditing(e.target.value)}
        onKeyDown={this.handleKeyDown}
        autoFocus
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
