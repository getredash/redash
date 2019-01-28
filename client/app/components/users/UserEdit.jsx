import React from 'react';
import Icon from 'antd/lib/icon';
import Input from 'antd/lib/input';
import Tooltip from 'antd/lib/tooltip';
import Modal from 'antd/lib/modal';
import { react2angular } from 'react2angular';
import { User } from '@/services/user';
import { UserProfile } from '../proptypes';
import { DynamicForm } from '../dynamic-form/DynamicForm';

export class UserEdit extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { user: this.props.user };
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

  regenerateApiKey = () => {
    const doRegenerate = () => {
      User.regenerateApiKey(this.state.user).then(({ data }) => {
        if (data) {
          const { user } = this.state;
          this.setState({ user: { ...user, apiKey: data.api_key } });
        }
      });
    };

    Modal.confirm({
      title: 'Regenerate API Key',
      content: 'Are you sure you want to regenerate?',
      okText: 'Regenerate',
      onOk: doRegenerate,
      autoFocusButton: null,
    });
  };

  renderApiKey() {
    const { user } = this.state;

    const regenerateButton = (
      <Tooltip title="Regenerate API Key">
        <Icon type="reload" style={{ cursor: 'pointer' }} onClick={this.regenerateApiKey} />
      </Tooltip>
    );

    return (
      <div>
        <label>API Key</label>
        <Input addonAfter={regenerateButton} value={user.apiKey} readOnly />
      </div>
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
        <hr />
        {!user.isDisabled && this.renderApiKey()}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('userEdit', react2angular(UserEdit));
}

init.init = true;
