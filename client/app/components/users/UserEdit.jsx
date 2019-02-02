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
    };
  }

  handleSave = (values, onSuccess, onError) => {
    const data = {
      id: this.props.user.id,
      ...values,
    };

    User.save(data, (user) => {
      onSuccess('Saved.');
      this.setState({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profileImageUrl: user.profile_image_url,
          apiKey: user.api_key,
          isDisabled: user.is_disabled,
        },
      });
    }, (error) => {
      onError(error.data.message || 'Failed saving.');
    });
  };

  handleUpdatePassword = (values, onSuccess, onError) => {
    if (values.password === values.password_repeat) {
      this.handleSave(values, onSuccess, onError);
    } else {
      onError('Passwords don\'t match!');
    }
  }

  openChangePasswordModal = () => {
    this.setState({ changingPassword: true });
  };

  sendPasswordReset = () => {
    const { user } = this.state;
    this.setState({ sendingPasswordEmail: true });

    User.sendPasswordReset(user).then((passwordResetLink) => {
      this.setState({ passwordResetLink });
    }).finally(() => {
      this.setState({ sendingPasswordEmail: false });
    });
  };

  regenerateApiKey = () => {
    const doRegenerate = () => {
      User.regenerateApiKey(this.state.user).then((apiKey) => {
        const { user } = this.state;
        this.setState({ user: { ...user, apiKey } });
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

  changePasswordModal() {
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
        <DynamicForm fields={fields} saveText="Update Password" onSubmit={this.handleUpdatePassword} />
      </Modal>
    );
  }

  renderApiKey() {
    const { user } = this.state;

    const regenerateButton = (
      <Tooltip title="Regenerate API Key">
        <Icon type="reload" style={{ cursor: 'pointer' }} onClick={this.regenerateApiKey} />
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

  renderPasswordReset() {
    const { user, sendingPasswordEmail, passwordResetLink } = this.state;

    return (
      <Fragment>
        <Button
          className="w-100 m-t-10"
          onClick={this.sendPasswordReset}
          loading={sendingPasswordEmail}
        >
          Send Password Reset Email
        </Button>
        {passwordResetLink && (
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
        )}
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
          alt="profile"
          src={user.profileImageUrl}
          className="profile__image"
          width="40"
        />
        <h3 className="profile__h3">{user.name}</h3>
        <hr />
        <DynamicForm fields={formFields} readOnly={user.isDisabled} onSubmit={this.handleSave} />
        {!user.isDisabled && (
          <Fragment>
            {this.renderApiKey()}
            <hr />
            {this.changePasswordModal()}
            <Button className="w-100 m-t-10" onClick={this.openChangePasswordModal}>Change Password</Button>
            {currentUser.isAdmin && this.renderPasswordReset()}
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
