import { isFunction, get } from "lodash";
import React from "react";
import Form from "antd/lib/form";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import { UserProfile } from "@/components/proptypes";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import User from "@/services/user";
import notification from "@/services/notification";

type Props = {
    user: UserProfile;
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
};

type State = any;

class ChangePasswordDialog extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      currentPassword: { value: "", error: null, touched: false },
      newPassword: { value: "", error: null, touched: false },
      repeatPassword: { value: "", error: null, touched: false },
      updatingPassword: false,
    };
  }

  fieldError = (name: any, value: any) => {
    if (value.length === 0) return "This field is required.";
    if (name !== "currentPassword" && value.length < 6) return "This field is too short.";
    if (name === "repeatPassword" && value !== this.state.newPassword.value) return "Passwords don't match";
    return null;
  };

  validateFields = (callback: any) => {
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
      this.validateFields((err: any) => {
        if (!err) {
          const userData = {
            id: this.props.user.id,
            old_password: currentPassword.value,
            password: newPassword.value,
          };

          this.setState({ updatingPassword: true });

          User.save(userData)
            .then(() => {
              // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
              notification.success("Saved.");
              this.props.dialog.close({ success: true });
            })
            .catch(error => {
              notification.error(get(error, "response.data.message", "Failed saving."));
              this.setState({ updatingPassword: false });
            });
        } else {
          this.setState((prevState: any) => ({
            currentPassword: { ...prevState.currentPassword, touched: true },
            newPassword: { ...prevState.newPassword, touched: true },
            repeatPassword: { ...prevState.repeatPassword, touched: true }
          }));
        }
      });
    }
  };

  handleChange = (e: any) => {
    const { name, value } = e.target;
    const { error } = this.state[name];

    this.setState({ [name]: { value, error, touched: true } }, () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 0.
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
            // @ts-expect-error ts-migrate(2322) FIXME: Type '"error" | null' is not assignable to type '"... Remove this comment to see the full error message
            validateStatus={currentPassword.touched && currentPassword.error ? "error" : null}
            help={currentPassword.touched ? currentPassword.error : null}
            label="Current Password">
            <Input.Password {...inputProps} name="currentPassword" data-test="CurrentPassword" autoFocus />
          </Form.Item>
          <Form.Item
            {...formItemProps}
            // @ts-expect-error ts-migrate(2322) FIXME: Type '"error" | null' is not assignable to type '"... Remove this comment to see the full error message
            validateStatus={newPassword.touched && newPassword.error ? "error" : null}
            help={newPassword.touched ? newPassword.error : null}
            label="New Password">
            <Input.Password {...inputProps} name="newPassword" data-test="NewPassword" />
          </Form.Item>
          <Form.Item
            {...formItemProps}
            // @ts-expect-error ts-migrate(2322) FIXME: Type '"error" | null' is not assignable to type '"... Remove this comment to see the full error message
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
