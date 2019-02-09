import React, { Fragment } from 'react';
import Alert from 'antd/lib/alert';
import Button from 'antd/lib/button';
import Form from 'antd/lib/form';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';
import Tooltip from 'antd/lib/tooltip';
import Modal from 'antd/lib/modal';
import { react2angular } from 'react2angular';
import { User } from '@/services/user';
import { currentUser } from '@/services/auth';
import { absoluteUrl } from '@/services/utils';
import { UserProfile } from '../proptypes';
import { DynamicForm } from '../dynamic-form/DynamicForm';
import InputWithCopy from '../InputWithCopy';

export class UserEdit extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      user: this.props.user,
      passwordModalIsOpen: false,
      sendingPasswordEmail: false,
      resendingInvitation: false,
      togglingUser: false,
    };
  }

  onClickChangePassword = () => {
    this.setState({ passwordModalIsOpen: true });
  };

  onClickSendPasswordReset = () => {
    this.setState({ sendingPasswordEmail: true });

    User.sendPasswordReset(this.state.user).then((passwordResetLink) => {
      this.setState({ passwordResetLink });
    }).finally(() => {
      this.setState({ sendingPasswordEmail: false });
    });
  };

  onClickResendInvitation = () => {
    this.setState({ resendingInvitation: true });

    User.resendInvitation(this.state.user).finally(() => {
      this.setState({ resendingInvitation: false });
    });
  };

  onClickRegenerateApiKey = () => {
    const doRegenerate = () => {
      User.regenerateApiKey(this.state.user).then((apiKey) => {
        if (apiKey) {
          const { user } = this.state;
          this.setState({ user: { ...user, apiKey } });
        }
      });
    };

    Modal.confirm({
      title: 'Regenerate API Key',
      content: 'Are you sure you want to regenerate?',
      okText: 'Regenerate',
      onOk: doRegenerate,
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  onClickToggleUser = () => {
    const { user } = this.state;
    const toggleUser = user.isDisabled ? User.enableUser : User.disableUser;

    this.setState({ togglingUser: true });
    toggleUser(user).then((data) => {
      if (data) {
        this.setState({ user: User.convertUserInfo(data.data) });
      }
    }).finally(() => {
      this.setState({ togglingUser: false });
    });
  };

  saveUser = (values, successCallback, errorCallback) => {
    const data = {
      id: this.props.user.id,
      ...values,
    };

    User.save(data, (user) => {
      successCallback('Saved.');
      this.setState({ user: User.convertUserInfo(user) });
    }, (error = {}) => {
      errorCallback(error.data && error.data.message || 'Failed saving.');
    });
  };

  updatePassword = (values, successCallback, errorCallback) => {
    if (values.password === values.password_repeat) {
      this.saveUser(values, successCallback, errorCallback);
    } else {
      errorCallback('Passwords don\'t match.');
    }
  }

  renderBasicInfoForm() {
    const { user } = this.state;
    const formFields = [
      {
        name: 'name',
        title: 'Name',
        type: 'text',
        initialValue: user.name,
        required: true,
      },
      {
        name: 'email',
        title: 'Email',
        type: 'email',
        initialValue: user.email,
        required: true,
      },
    ];

    return (
      <DynamicForm
        fields={formFields}
        readOnly={user.isDisabled}
        onSubmit={this.saveUser}
      />
    );
  }

  renderChangePassword() {
    const fields = [
      { name: 'old_password', title: 'Current Password' },
      { name: 'password', title: 'New Password', minLength: 6 },
      { name: 'password_repeat', title: 'Repeat New Password' },
    ].map(field => ({ ...field, type: 'password', required: true }));

    return (
      <Fragment>
        <hr />
        <Modal
          visible={this.state.passwordModalIsOpen}
          title="Change Password"
          onCancel={() => { this.setState({ passwordModalIsOpen: false }); }}
          footer={null}
          destroyOnClose
        >
          <DynamicForm fields={fields} saveText="Update Password" onSubmit={this.updatePassword} />
        </Modal>
        <Button className="w-100 m-t-10" onClick={this.onClickChangePassword} data-test="ChangePassword">
          Change Password
        </Button>
      </Fragment>
    );
  }

  renderApiKey() {
    const { user } = this.state;

    const regenerateButton = (
      <Tooltip title="Regenerate API Key">
        <Icon
          type="reload"
          style={{ cursor: 'pointer' }}
          data-test="RegenerateApiKey"
          onClick={this.onClickRegenerateApiKey}
        />
      </Tooltip>
    );

    return (
      <Form layout="vertical">
        <hr />
        <Form.Item label="API Key">
          <Input id="apiKey" addonAfter={regenerateButton} value={user.apiKey} data-test="ApiKey" readOnly />
        </Form.Item>
      </Form>
    );
  }

  renderPasswordLinkAlert() {
    const { user, passwordResetLink } = this.state;

    return (
      <Alert
        message="Email not sent!"
        description={(
          <Fragment>
            <p>
              The mail server is not configured, please send the following link
              to <b>{user.name}</b> to reset their password:
            </p>
            <InputWithCopy value={absoluteUrl(passwordResetLink)} readOnly />
          </Fragment>
        )}
        type="warning"
        className="m-t-20"
        afterClose={() => { this.setState({ passwordResetLink: null }); }}
        closable
      />
    );
  }

  renderResendInvitation() {
    return (
      <Button
        className="w-100 m-t-10"
        onClick={this.onClickResendInvitation}
        loading={this.state.resendingInvitation}
      >
        Resend Invitation
      </Button>
    );
  }

  renderSendPasswordReset() {
    const { sendingPasswordEmail, passwordResetLink } = this.state;

    return (
      <Fragment>
        <Button
          className="w-100 m-t-10"
          onClick={this.onClickSendPasswordReset}
          loading={sendingPasswordEmail}
        >
          Send Password Reset Email
        </Button>
        {passwordResetLink && this.renderPasswordLinkAlert()}
      </Fragment>
    );
  }

  renderToggleUser() {
    const { user, togglingUser } = this.state;

    return user.isDisabled ? (
      <Button className="w-100 m-t-10" type="primary" onClick={this.onClickToggleUser} loading={togglingUser}>
        Enable User
      </Button>
    ) : (
      <Button className="w-100 m-t-10" type="danger" onClick={this.onClickToggleUser} loading={togglingUser}>
        Disable User
      </Button>
    );
  }

  render() {
    const { user } = this.state;

    return (
      <div className="col-md-4 col-md-offset-4">
        <img
          alt="Profile"
          src={user.profileImageUrl}
          className="profile__image"
          width="40"
        />
        <h3 className="profile__h3">{user.name}</h3>
        <hr />
        {this.renderBasicInfoForm()}
        {!user.isDisabled && (
          <Fragment>
            {this.renderApiKey()}
            {this.renderChangePassword()}
            {currentUser.isAdmin && (
              user.isInvitationPending ?
                this.renderResendInvitation() : this.renderSendPasswordReset()
            )}
          </Fragment>
        )}
        {currentUser.isAdmin && user.id !== currentUser.id && this.renderToggleUser()}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('userEdit', react2angular(UserEdit));
}

init.init = true;
