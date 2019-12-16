import React, { Fragment } from "react";
import { includes } from "lodash";
import Alert from "antd/lib/alert";
import Button from "antd/lib/button";
import Form from "antd/lib/form";
import Modal from "antd/lib/modal";
import Tag from "antd/lib/tag";
import { User } from "@/services/user";
import { Group } from "@/services/group";
import { currentUser } from "@/services/auth";
import { absoluteUrl } from "@/services/utils";
import { UserProfile } from "../proptypes";
import DynamicForm from "../dynamic-form/DynamicForm";
import ChangePasswordDialog from "./ChangePasswordDialog";
import InputWithCopy from "../InputWithCopy";

export default class UserEdit extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      user: this.props.user,
      groups: [],
      loadingGroups: true,
      regeneratingApiKey: false,
      sendingPasswordEmail: false,
      resendingInvitation: false,
      togglingUser: false,
    };
  }

  componentDidMount() {
    Group.query(groups => {
      this.setState({
        groups: groups.map(({ id, name }) => ({ value: id, name })),
        loadingGroups: false,
      });
    });
  }

  changePassword = () => {
    ChangePasswordDialog.showModal({ user: this.props.user });
  };

  sendPasswordReset = () => {
    this.setState({ sendingPasswordEmail: true });

    User.sendPasswordReset(this.state.user)
      .then(passwordLink => {
        this.setState({ passwordLink });
      })
      .finally(() => {
        this.setState({ sendingPasswordEmail: false });
      });
  };

  resendInvitation = () => {
    this.setState({ resendingInvitation: true });

    User.resendInvitation(this.state.user)
      .then(passwordLink => {
        this.setState({ passwordLink });
      })
      .finally(() => {
        this.setState({ resendingInvitation: false });
      });
  };

  regenerateApiKey = () => {
    const doRegenerate = () => {
      this.setState({ regeneratingApiKey: true });
      User.regenerateApiKey(this.state.user)
        .then(apiKey => {
          if (apiKey) {
            const { user } = this.state;
            this.setState({ user: { ...user, apiKey } });
          }
        })
        .finally(() => {
          this.setState({ regeneratingApiKey: false });
        });
    };

    Modal.confirm({
      title: "Regenerate API Key",
      content: "Are you sure you want to regenerate?",
      okText: "Regenerate",
      onOk: doRegenerate,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  toggleUser = () => {
    const { user } = this.state;
    const toggleUser = user.isDisabled ? User.enableUser : User.disableUser;

    this.setState({ togglingUser: true });
    toggleUser(user)
      .then(data => {
        if (data) {
          this.setState({ user: User.convertUserInfo(data.data) });
        }
      })
      .finally(() => {
        this.setState({ togglingUser: false });
      });
  };

  saveUser = (values, successCallback, errorCallback) => {
    const data = {
      id: this.props.user.id,
      ...values,
    };

    User.save(
      data,
      user => {
        successCallback("Saved.");
        this.setState({ user: User.convertUserInfo(user) });
      },
      (error = {}) => {
        errorCallback((error.data && error.data.message) || "Failed saving.");
      }
    );
  };

  renderUserInfoForm() {
    const { user, groups, loadingGroups } = this.state;

    const formFields = [
      {
        name: "name",
        title: "Name",
        type: "text",
        initialValue: user.name,
      },
      {
        name: "email",
        title: "Email",
        type: "email",
        initialValue: user.email,
      },
      !user.isDisabled && currentUser.id !== user.id
        ? {
            name: "group_ids",
            title: "Groups",
            type: "select",
            mode: "multiple",
            options: groups,
            initialValue: groups.filter(group => includes(user.groupIds, group.value)).map(group => group.value),
            loading: loadingGroups,
            placeholder: loadingGroups ? "Loading..." : "",
          }
        : {
            name: "group_ids",
            title: "Groups",
            type: "content",
            content: this.renderUserGroups(),
          },
    ].map(field => ({ readOnly: user.isDisabled, required: true, ...field }));

    return <DynamicForm fields={formFields} onSubmit={this.saveUser} hideSubmitButton={user.isDisabled} />;
  }

  renderUserGroups() {
    const { user, groups, loadingGroups } = this.state;

    return loadingGroups ? (
      "Loading..."
    ) : (
      <div data-test="Groups">
        {groups
          .filter(group => includes(user.groupIds, group.value))
          .map(group => (
            <Tag className="m-b-5 m-r-5" key={group.value}>
              <a href={`groups/${group.value}`}>{group.name}</a>
            </Tag>
          ))}
      </div>
    );
  }

  renderApiKey() {
    const { user, regeneratingApiKey } = this.state;

    return (
      <Form layout="vertical">
        <hr />
        <Form.Item label="API Key" className="m-b-10">
          <InputWithCopy id="apiKey" className="hide-in-percy" value={user.apiKey} data-test="ApiKey" readOnly />
        </Form.Item>
        <Button
          className="w-100"
          onClick={this.regenerateApiKey}
          loading={regeneratingApiKey}
          data-test="RegenerateApiKey">
          Regenerate
        </Button>
      </Form>
    );
  }

  renderPasswordLinkAlert() {
    const { user, passwordLink } = this.state;

    return (
      <Alert
        message="Email not sent!"
        description={
          <Fragment>
            <p>
              The mail server is not configured, please send the following link to <b>{user.name}</b>:
            </p>
            <InputWithCopy value={absoluteUrl(passwordLink)} readOnly />
          </Fragment>
        }
        type="warning"
        className="m-t-20"
        afterClose={() => {
          this.setState({ passwordLink: null });
        }}
        closable
      />
    );
  }

  renderResendInvitation() {
    return (
      <Button className="w-100 m-t-10" onClick={this.resendInvitation} loading={this.state.resendingInvitation}>
        Resend Invitation
      </Button>
    );
  }

  renderSendPasswordReset() {
    const { sendingPasswordEmail } = this.state;

    return (
      <Fragment>
        <Button className="w-100 m-t-10" onClick={this.sendPasswordReset} loading={sendingPasswordEmail}>
          Send Password Reset Email
        </Button>
      </Fragment>
    );
  }

  rendertoggleUser() {
    const { user, togglingUser } = this.state;

    return user.isDisabled ? (
      <Button className="w-100 m-t-10" type="primary" onClick={this.toggleUser} loading={togglingUser}>
        Enable User
      </Button>
    ) : (
      <Button className="w-100 m-t-10" type="danger" onClick={this.toggleUser} loading={togglingUser}>
        Disable User
      </Button>
    );
  }

  render() {
    const { user, passwordLink } = this.state;

    return (
      <div className="col-md-4 col-md-offset-4">
        <img alt="Profile" src={user.profileImageUrl} className="profile__image" width="40" />
        <h3 className="profile__h3">{user.name}</h3>
        <hr />
        {this.renderUserInfoForm()}
        {!user.isDisabled && (
          <Fragment>
            {this.renderApiKey()}
            <hr />
            <h5>Password</h5>
            {user.id === currentUser.id && (
              <Button className="w-100 m-t-10" onClick={this.changePassword} data-test="ChangePassword">
                Change Password
              </Button>
            )}
            {currentUser.isAdmin && user.id !== currentUser.id && (
              <Fragment>
                {user.isInvitationPending ? this.renderResendInvitation() : this.renderSendPasswordReset()}
                {passwordLink && this.renderPasswordLinkAlert()}
              </Fragment>
            )}
          </Fragment>
        )}
        <hr />
        {currentUser.isAdmin && user.id !== currentUser.id && this.rendertoggleUser()}
      </div>
    );
  }
}
