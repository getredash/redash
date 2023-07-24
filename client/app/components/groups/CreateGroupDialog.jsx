import React from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

class CreateGroupDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
  };

  state = {
    name: "",
  };

  save = () => {
    this.props.dialog.close({
      name: this.state.name,
    });
  };

  render() {
    const { dialog } = this.props;
    return (
      <Modal {...dialog.props} title="Create a New Group" okText="Create" onOk={() => this.save()}>
        <Input
          className="form-control"
          defaultValue={this.state.name}
          onChange={event => this.setState({ name: event.target.value })}
          onPressEnter={() => this.save()}
          placeholder="Group Name"
          aria-label="Group name"
          autoFocus
        />
      </Modal>
    );
  }
}

export default wrapDialog(CreateGroupDialog);
