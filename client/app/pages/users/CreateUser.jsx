import { get } from 'lodash';
import React from 'react';
import { react2angular } from 'react2angular';

import Alert from 'antd/lib/alert';
import { DynamicForm } from '@/components/dynamic-form/DynamicForm';
import { EmailSettingsWarning } from '@/components/EmailSettingsWarning';

import { User } from '@/services/user';
import recordEvent from '@/services/recordEvent';
import { routesToAngularRoutes } from '@/lib/utils';

class CreateUser extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  componentDidMount() {
    recordEvent('view', 'page', 'users/new');
  }

  createUser = (values, successCallback, errorCallback) => {
    User.create(values, (user) => {
      successCallback('Saved.');
      this.setState({ user });
    }, (error) => {
      const message = get(error, 'data.message', 'Failed saving.');
      errorCallback(message);
    });
  };

  render() {
    const { user } = this.state;
    const formFields = [
      { name: 'name', title: 'Name', type: 'text' },
      { name: 'email', title: 'Email', type: 'email' },
    ].map(field => ({ required: true, readOnly: !!user, ...field }));

    const message = user && user.invite_link ? (
      <div>
        <span>The user has been created. You can use the following link to invite them:</span>
        <textarea className="form-control m-t-10" rows="3" readOnly>{user.invite_link}</textarea>
      </div>
    ) : <span>The user has been created and should receive an invite email soon.</span>;

    return (
      <div className="row">
        <EmailSettingsWarning featureName="invite emails" />
        <div className="col-md-4 col-md-offset-4 creation-container">
          <h3>New User</h3>
          <DynamicForm
            fields={formFields}
            saveText="Create"
            onSubmit={this.createUser}
            hideSubmitButton={!!user}
          />
          {user && (
            <Alert
              message={message}
              type="success"
              className="m-t-20"
            />
          )}

        </div>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('pageCreateUser', react2angular(CreateUser));

  return routesToAngularRoutes([
    {
      path: '/users/new',
      title: 'Users',
      key: 'users',
    },
  ], {
    reloadOnSearch: false,
    template: '<settings-screen><page-create-user on-error="handleError"></page-create-user></settings-screen>',
    controller($scope, $exceptionHandler) {
      'ngInject';

      $scope.handleError = $exceptionHandler;
    },
  });
}

init.init = true;
