import { map, trim, chain } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';

const { Option } = Select;

export default class TagsEditorModal extends React.Component {
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
      result: chain(this.props.tags).map(trim).uniq().value(),
    };

    this.selectOptions =
      chain(this.props.availableTags)
        .map(trim)
        .uniq()
        .map(tag => <Option key={tag}>{tag}</Option>)
        .value();
  }

  render() {
    const { close, dismiss } = this.props;
    const { result } = this.state;

    return (
      <Modal
        visible
        title="Add/Edit Tags"
        onOk={() => close(result)}
        onCancel={dismiss}
      >
        <Select
          mode="tags"
          className="w-100"
          placeholder="Add some tags..."
          defaultValue={result}
          onChange={values => this.setState({ result: map(values, trim) })}
        >
          {this.selectOptions}
        </Select>
      </Modal>
    );
  }
}
