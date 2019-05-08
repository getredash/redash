import { map, trim, uniq, filter } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Select from 'antd/lib/select';
import Modal from 'antd/lib/modal';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

class EditTagsDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    tags: PropTypes.arrayOf(PropTypes.string),
    getAvailableTags: PropTypes.func.isRequired,
  };

  static defaultProps = {
    tags: [],
  };

  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      availableTags: [],
      result: uniq(map(this.props.tags, trim)),
    };
  }

  componentDidMount() {
    this.props.getAvailableTags().then((availableTags) => {
      this.setState({
        loading: false,
        availableTags: uniq(filter(map(availableTags, trim), Boolean)),
      });
    });
  }

  render() {
    const { dialog } = this.props;
    const { loading, availableTags, result } = this.state;
    return (
      <Modal
        {...dialog.props}
        onOk={() => dialog.close(result)}
        title="Add/Edit Tags"
        className="shortModal"
      >
        <Select
          mode="tags"
          className="w-100"
          placeholder="Add some tags..."
          defaultValue={result}
          onChange={values => this.setState({ result: filter(map(values, trim), Boolean) })}
          autoFocus
          disabled={loading}
          loading={loading}
        >
          {map(availableTags, tag => <Select.Option key={tag}>{tag}</Select.Option>)}
        </Select>
      </Modal>
    );
  }
}

export default wrapDialog(EditTagsDialog);
