import React from 'react';
import { react2angular } from 'react2angular';

import { EmailSettingsWarning } from '@/components/EmailSettingsWarning';
import UserEdit from '@/components/users/UserEdit';
import UserShow from '@/components/users/UserShow';
import LoadingState from '@/components/items-list/components/LoadingState';

import { User } from '@/services/user';
import settingsMenu from '@/services/settingsMenu';
import { $route } from '@/services/ng';
import { currentUser } from '@/services/auth';
import './settings.less';

class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  componentDidMount() {
    const userId = $route.current.params.userId || currentUser.id;
    User.get({ id: userId }, user => this.setState({ user: User.convertUserInfo(user) }));
  }

  render() {
    const { user } = this.state;
    const canEdit = user && (currentUser.isAdmin || currentUser.id === user.id);
    const UserComponent = canEdit ? UserEdit : UserShow;
    return (
      <React.Fragment>
        <EmailSettingsWarning featureName="invite emails" />
        <div className="row">
          {user ? <UserComponent user={user} /> : <LoadingState className="" />}
        </div>
      </React.Fragment>
    );
  }
}

export default function init(ngModule) {
  settingsMenu.add({
    title: 'Account',
    path: 'users/me',
    order: 7,
  });

  ngModule.component('pageUserProfile', react2angular(UserProfile));
}

init.init = true;
