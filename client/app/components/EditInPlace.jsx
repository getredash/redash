import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { trim } from 'lodash';

export class EditInPlace extends React.Component {
  static propTypes = {
    ignoreBlanks: PropTypes.bool,
    isEditable: PropTypes.bool,
    editor: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    value: PropTypes.string,
    onDone: PropTypes.func.isRequired,
  };

  static defaultProps = {
    ignoreBlanks: false,
    isEditable: true,
    placeholder: '',
    value: '',
  };

  constructor(props) {
    super(props);
    this.state = {
      editing: false,
    };
    this.inputRef = React.createRef();
    const self = this;
    this.componentDidUpdate = (prevProps, prevState) => {
      if (self.state.editing && !prevState.editing) {
        self.inputRef.current.focus();
      }
    };
  }

  startEditing = () => {
    if (this.props.isEditable) {
      this.setState({ editing: true });
    }
  };

  stopEditing = () => {
    const newValue = trim(this.inputRef.current.value);
    const ignorableBlank = this.props.ignoreBlanks && newValue === '';
    if (!ignorableBlank && newValue !== this.props.value) {
      this.props.onDone(newValue);
    }
    this.setState({ editing: false });
  };

  keyDown = (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      this.stopEditing();
    } else if (event.keyCode === 27) {
      this.setState({ editing: false });
    }
  };

  renderNormal = () => (
    <span
      role="presentation"
      onFocus={this.startEditing}
      onClick={this.startEditing}
      className={this.props.isEditable ? 'editable' : ''}
    >
      {this.props.value || this.props.placeholder}
    </span>
  );

  renderEdit = () => React.createElement(this.props.editor, {
    ref: this.inputRef,
    className: 'rd-form-control',
    defaultValue: this.props.value,
    onBlur: this.stopEditing,
    onKeyDown: this.keyDown,
  });

  render() {
    return (
      <span className={'edit-in-place' + (this.state.editing ? ' active' : '')}>
        {this.state.editing ? this.renderEdit() : this.renderNormal()}
      </span>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('editInPlace', react2angular(EditInPlace));
}

init.init = true;
