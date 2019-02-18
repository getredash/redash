import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

class CreateGroupDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    group: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  state = {
    name: this.props.group.name,
  };

  save() {
    const { dialog, group } = this.props;
    const { name } = this.state;

    group.name = name;
    dialog.close(group);
  }

  render() {
    const { dialog, group } = this.props;
    const isNewGroup = !group.id;
    const title = isNewGroup ? 'Create a New Group' : 'Edit Group';
    const buttonTitle = isNewGroup ? 'Create' : 'Save';
    return (
      <Modal {...dialog.props} title={title} okText={buttonTitle} onOk={() => this.save()}>
        <Input
          className="form-control"
          defaultValue={this.state.name}
          onChange={event => this.setState({ name: event.target.value })}
          placeholder="Group Name"
          autoFocus
        />
      </Modal>
    );
  }
}

export default wrapDialog(CreateGroupDialog);
