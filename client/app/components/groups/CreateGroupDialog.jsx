import React from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Checkbox from "antd/lib/checkbox";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

class CreateGroupDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
  };

  state = {
    name: "",
    is_view_only: false,
  };

  save = () => {
    this.props.dialog.close({
      name: this.state.name,
      is_view_only: this.state.is_view_only,
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
        <div className="m-t-10">
          <Checkbox
            data-test="GroupViewOnly"
            checked={this.state.is_view_only}
            onChange={event => this.setState({ is_view_only: event.target.checked })}>
            View Only Group
          </Checkbox>
          <div className="text-muted m-t-5">
            Users in this group can only view queries and dashboards, but cannot see SQL or download results.
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(CreateGroupDialog);
