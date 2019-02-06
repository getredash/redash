import { map, trim, uniq } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';

export default class TagsEditorModal extends React.Component {
  static propTypes = {
    tags: PropTypes.arrayOf(PropTypes.string),
    getAvailableTags: PropTypes.func.isRequired,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
  };

  static defaultProps = {
    tags: [],
    onConfirm: () => {},
    onCancel: () => {},
  };

  constructor(props) {
    super(props);

    this.state = {
      isVisible: true,
      loading: true,
      availableTags: [],
      result: uniq(map(this.props.tags, trim)),
      onAfterClose: () => {},
    };
  }

  componentDidMount() {
    this.props.getAvailableTags().then((availableTags) => {
      this.setState({
        loading: false,
        availableTags: uniq(map(availableTags, trim)),
      });
    });
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
          disabled={this.state.loading}
          loading={this.state.loading}
        >
          {map(this.state.availableTags, tag => <Select.Option key={tag}>{tag}</Select.Option>)}
        </Select>
      </Modal>
    );
  }
}
