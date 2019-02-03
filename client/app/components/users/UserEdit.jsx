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
import { currentUser, clientConfig } from '@/services/auth';
import { absoluteUrl } from '@/services/utils';
import { UserProfile } from '../proptypes';
import { DynamicForm } from '../dynamic-form/DynamicForm';

export class UserEdit extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      user: this.props.user,
      changingPassword: false,
      sendingPasswordEmail: false,
      resendingInvitation: false,
    };
  }

  onSaveUser = (values, successCallback, errorCallback) => {
    const data = {
      id: this.props.user.id,
      ...values,
    };

    User.save(data, (user) => {
      successCallback('Saved.');
      this.setState({ user: User.convertUserInfo(user) });
    }, (error) => {
      errorCallback(error.data.message || 'Failed saving.');
    });
  };

  onUpdatePassword = (values, successCallback, errorCallback) => {
    if (values.password === values.password_repeat) {
      this.onSaveUser(values, successCallback, errorCallback);
    } else {
      errorCallback('Passwords don\'t match!');
    }
  }

  onClickChangePassword = () => {
    this.setState({ changingPassword: true });
  };

  onClickSendPasswordReset = () => {
    const { user } = this.state;
    this.setState({ sendingPasswordEmail: true });

    User.sendPasswordReset(user).then((passwordResetLink) => {
      this.setState({ passwordResetLink });
    }).finally(() => {
      this.setState({ sendingPasswordEmail: false });
    });
  };

  onClickResendInvitation = () => {
    const { user } = this.state;
    this.setState({ resendingInvitation: true });

    User.resendInvitation(user).finally(() => {
      this.setState({ resendingInvitation: false });
    });
  };

  onClickRegenerateApiKey = () => {
    const doRegenerate = () => {
      User.regenerateApiKey(this.state.user).then((apiKey) => {
        this.setState(prevState => ({ user: { ...prevState.user, apiKey } }));
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

  renderChangePasswordModal() {
    const fields = [
      { name: 'old_password', title: 'Current Password' },
      { name: 'password', title: 'New Password', minLength: 6 },
      { name: 'password_repeat', title: 'Repeat New Password' },
    ].map(field => ({ ...field, type: 'password', required: true }));

    return (
      <Modal
        visible={this.state.changingPassword}
        title="Change Password"
        onCancel={() => { this.setState({ changingPassword: false }); }}
        footer={null}
        destroyOnClose
      >
        <DynamicForm fields={fields} saveText="Update Password" onSubmit={this.onUpdatePassword} />
      </Modal>
    );
  }

  renderApiKey() {
    const { user } = this.state;

    const regenerateButton = (
      <Tooltip title="Regenerate API Key">
        <Icon type="reload" style={{ cursor: 'pointer' }} onClick={this.onClickRegenerateApiKey} />
      </Tooltip>
    );

    return (
      <Form layout="vertical">
        <hr />
        <Form.Item label="API Key">
          <Input id="apiKey" addonAfter={regenerateButton} value={user.apiKey} readOnly />
        </Form.Item>
      </Form>
    );
  }

  renderPasswordLinkAlert() {
    const { user, passwordResetLink } = this.state;

    return (
      <Alert
        message={clientConfig.mailSettingsMissing ? (
          <p>
            The mail server is not configured, please send the following link
            to {user.name} to reset their password:
            <Input.TextArea value={absoluteUrl(passwordResetLink)} readOnly />
          </p>
        ) : 'The user should receive a link to reset their password by email soon.'}
        type="success"
        className="m-t-20"
        afterClose={() => { this.setState({ passwordResetLink: null }); }}
        closable
      />
    );
  }

  renderPasswordOptions() {
    const { sendingPasswordEmail, passwordResetLink, resendingInvitation } = this.state;

    return (
      <Fragment>
        {this.state.user.isInvitationPending ? (
          <Button
            className="w-100 m-t-10"
            onClick={this.onClickResendInvitation}
            loading={resendingInvitation}
          >
            Resend Invitation
          </Button>
        ) : (
          <Button
            className="w-100 m-t-10"
            onClick={this.onClickSendPasswordReset}
            loading={sendingPasswordEmail}
          >
            Send Password Reset Email
          </Button>
        )}
        {passwordResetLink && this.renderPasswordLinkAlert()}
      </Fragment>
    );
  }

  render() {
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
      <div className="col-md-4 col-md-offset-4">
        <img
          alt="Profile"
          src={user.profileImageUrl}
          className="profile__image"
          width="40"
        />
        <h3 className="profile__h3">{user.name}</h3>
        <hr />
        <DynamicForm fields={formFields} readOnly={user.isDisabled} onSubmit={this.onSaveUser} />
        {!user.isDisabled && (
          <Fragment>
            {this.renderApiKey()}
            <hr />
            {this.renderChangePasswordModal()}
            <Button className="w-100 m-t-10" onClick={this.onClickChangePassword}>Change Password</Button>
            {currentUser.isAdmin && this.renderPasswordOptions()}
          </Fragment>
        )}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('userEdit', react2angular(UserEdit));
}

init.init = true;
