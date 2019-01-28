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
    this.state = { apiKey: props.user.apiKey };
  }

  regenerateApiKey = () => {
    const doRegenerate = () => {
      User.regenerateApiKey(this.props.user).then(({ data }) => {
        if (data) {
          this.setState({ apiKey: data.api_key });
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

  render() {
    const { user } = this.props;

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

    const regenerateButton = (
      <Tooltip title="Regenerate API Key">
        <Icon type="reload" style={{ cursor: 'pointer' }} onClick={this.regenerateApiKey} />
      </Tooltip>
    );

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
        <DynamicForm fields={formFields} />
        <hr />
        <label>API Key</label>
        <Input addonAfter={regenerateButton} value={this.state.apiKey} readOnly />
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('userEdit', react2angular(UserEdit));
}

init.init = true;
