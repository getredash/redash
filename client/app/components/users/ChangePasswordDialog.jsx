import React from "react";
import Form from "antd/lib/form";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import { isFunction } from "lodash";
import { User } from "@/services/user";
import notification from "@/services/notification";
import { UserProfile } from "../proptypes";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

class ChangePasswordDialog extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
    dialog: DialogPropType.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      currentPassword: { value: "", error: null, touched: false },
      newPassword: { value: "", error: null, touched: false },
      repeatPassword: { value: "", error: null, touched: false },
      updatingPassword: false,
    };
  }

  fieldError = (name, value) => {
    if (value.length === 0) return "This field is required.";
    if (name !== "currentPassword" && value.length < 6) return "This field is too short.";
    if (name === "repeatPassword" && value !== this.state.newPassword.value) return "Passwords don't match";
    return null;
  };

  validateFields = callback => {
    const { currentPassword, newPassword, repeatPassword } = this.state;

    const errors = {
      currentPassword: this.fieldError("currentPassword", currentPassword.value),
      newPassword: this.fieldError("newPassword", newPassword.value),
      repeatPassword: this.fieldError("repeatPassword", repeatPassword.value),
    };

    this.setState({
      currentPassword: { ...currentPassword, error: errors.currentPassword },
      newPassword: { ...newPassword, error: errors.newPassword },
      repeatPassword: { ...repeatPassword, error: errors.repeatPassword },
    });

    if (isFunction(callback)) {
      if (errors.currentPassword || errors.newPassword || errors.repeatPassword) {
        callback(errors);
      } else callback(null);
    }
  };

  updatePassword = () => {
    const { currentPassword, newPassword, updatingPassword } = this.state;

    if (!updatingPassword) {
      this.validateFields(err => {
        if (!err) {
          const userData = {
            id: this.props.user.id,
            old_password: currentPassword.value,
            password: newPassword.value,
          };

          this.setState({ updatingPassword: true });

          User.save(
            userData,
            () => {
              notification.success("Saved.");
              this.props.dialog.close({ success: true });
            },
            (error = {}) => {
              notification.error((error.data && error.data.message) || "Failed saving.");
              this.setState({ updatingPassword: false });
            }
          );
        } else {
          this.setState(prevState => ({
            currentPassword: { ...prevState.currentPassword, touched: true },
            newPassword: { ...prevState.newPassword, touched: true },
            repeatPassword: { ...prevState.repeatPassword, touched: true },
          }));
        }
      });
    }
  };

  handleChange = e => {
    const { name, value } = e.target;
    const { error } = this.state[name];

    this.setState({ [name]: { value, error, touched: true } }, () => {
      this.validateFields();
    });
  };

  render() {
    const { dialog } = this.props;
    const { currentPassword, newPassword, repeatPassword, updatingPassword } = this.state;

    const formItemProps = { className: "m-b-10", required: true };

    const inputProps = {
      onChange: this.handleChange,
      onPressEnter: this.updatePassword,
    };

    return (
      <Modal
        {...dialog.props}
        okButtonProps={{ loading: updatingPassword }}
        onOk={this.updatePassword}
        title="Change Password">
        <Form layout="vertical">
          <Form.Item
            {...formItemProps}
            validateStatus={currentPassword.touched && currentPassword.error ? "error" : null}
            help={currentPassword.touched ? currentPassword.error : null}
            label="Current Password">
            <Input.Password {...inputProps} name="currentPassword" data-test="CurrentPassword" autoFocus />
          </Form.Item>
          <Form.Item
            {...formItemProps}
            validateStatus={newPassword.touched && newPassword.error ? "error" : null}
            help={newPassword.touched ? newPassword.error : null}
            label="New Password">
            <Input.Password {...inputProps} name="newPassword" data-test="NewPassword" />
          </Form.Item>
          <Form.Item
            {...formItemProps}
            validateStatus={repeatPassword.touched && repeatPassword.error ? "error" : null}
            help={repeatPassword.touched ? repeatPassword.error : null}
            label="Repeat New Password">
            <Input.Password {...inputProps} name="repeatPassword" data-test="RepeatPassword" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
}

export default wrapDialog(ChangePasswordDialog);
