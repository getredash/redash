import React from 'react';
import { react2angular } from 'react2angular';

import { EmailSettingsWarning } from '@/components/EmailSettingsWarning';
import UserEdit from '@/components/users/UserEdit';
import UserShow from '@/components/users/UserShow';
import LoadingState from '@/components/items-list/components/LoadingState';

import { $route } from '@/services/ng';
import { User } from '@/services/user';
import { currentUser } from '@/services/auth';
import { routesToAngularRoutes } from '@/lib/utils';
import './settings.less';

class UserProfile extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  componentDidMount() {
    const { userId } = $route.current.params;
    User.get({ id: userId }, user => this.setState({ user: User.convertUserInfo(user) }));
  }

  render() {
    const { user } = this.state;
    const canEdit = (currentUser.isAdmin || currentUser.id === user.id);
    const UserComponent = canEdit ? UserEdit : UserShow;
    return (
      <div className="row">
        <EmailSettingsWarning featureName="invite emails" />
        {user ? <UserComponent user={user} /> : <LoadingState className="" />}
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageUserProfile', react2angular(UserProfile));

  return routesToAngularRoutes([
    {
      path: '/users/:userId',
      title: 'Users',
      key: 'users',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-user-profile on-error="handleError"></page-user-profile></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
