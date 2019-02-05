import { map, trim, chain } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';

export default class TagsEditorModal extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    availableTags: PropTypes.arrayOf(PropTypes.string),
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
  };

  static defaultProps = {
    tags: [],
    availableTags: [],
    onConfirm: () => {},
    onCancel: () => {},
  };

  constructor(props) {
    super(props);

    this.state = {
      isVisible: true,
      result: chain(this.props.tags).map(trim).uniq().value(),
      onAfterClose: () => {},
    };

    this.selectOptions =
      chain(this.props.availableTags)
        .map(trim)
        .uniq()
        .map(tag => <Select.Option key={tag}>{tag}</Select.Option>)
        .value();
  }

  onConfirm(result) {
    this.setState({
      isVisible: false,
      onAfterClose: () => this.props.onConfirm(result),
    });
  }

  onCancel() {
    this.setState({
      isVisible: false,
      onAfterClose: () => this.props.onCancel(),
    });
  }

  render() {
    return (
      <Modal
        visible={this.state.isVisible}
        title="Add/Edit Tags"
        onOk={() => this.onConfirm(this.state.result)}
        onCancel={() => this.onCancel()}
        afterClose={() => this.state.onAfterClose()}
      >
        <Select
          mode="tags"
          className="w-100"
          placeholder="Add some tags..."
          defaultValue={this.state.result}
          onChange={values => this.setState({ result: map(values, trim) })}
          autoFocus
        >
          {this.selectOptions}
        </Select>
      </Modal>
    );
  }
}
