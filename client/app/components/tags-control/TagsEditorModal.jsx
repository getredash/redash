import { map, trim, uniq } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { Select } from 'antd';

const Option = Select.Option;

class TagsEditorModal extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    availableTags: PropTypes.arrayOf(PropTypes.string),
    close: PropTypes.func,
    dismiss: PropTypes.func,
  };

  static defaultProps = {
    tags: [],
    availableTags: [],
    close: () => {},
    dismiss: () => {},
  };

  constructor(props) {
    super(props);
    this.state = {
      result: uniq(map(this.props.tags, trim)),
    };
    this.selectRef = React.createRef();
  }

  componentDidMount() {
    // `autoFocus` does not work on Select because its `componentDidMount` is fired before the component
    // is actually visible, so it cannot get focus. This hack should be replaced with `autoFocus` prop
    // when Angular will finally gone
    setTimeout(() => {
      if (
        this.selectRef.current &&
        this.selectRef.current.rcSelect &&
        this.selectRef.current.rcSelect.inputRef
      ) {
        this.selectRef.current.rcSelect.inputRef.focus();
      }
    });
  }

  render() {
    const {
      availableTags,
      close,
      dismiss,
    } = this.props;

    const uniqueAvailableTags = uniq(map(availableTags, trim));

    return (
      <div>
        <div className="modal-header">
          <button type="button" className="close" aria-hidden="true" onClick={dismiss}>&times;</button>
          <h4 className="modal-title">Add/Edit Tags</h4>
        </div>
        <div className="modal-body">
          <Select
            ref={this.selectRef}
            mode="tags"
            className="w-100"
            placeholder="Add some tags..."
            defaultValue={this.state.result}
            onChange={values => this.setState({ result: map(values, trim) })}
            dropdownClassName="ant-dropdown-in-bootstrap-modal"
          >
            {uniqueAvailableTags.map(tag => (<Option key={tag}>{tag}</Option>))}
          </Select>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-default" onClick={dismiss}>Close</button>
          <button type="button" className="btn btn-primary" onClick={() => close({ $value: this.state.result })}>Save</button>
        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('tagsEditorModal', {
    template: `
      <tags-editor-modal-impl 
        tags="$ctrl.resolve.tags"
        available-tags="$ctrl.resolve.availableTags"
        close="$ctrl.close"
        dismiss="$ctrl.dismiss"
      ></tags-editor-modal-impl>
    `,
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
  });
  ngModule.component('tagsEditorModalImpl', react2angular(TagsEditorModal));
}

init.init = true;
