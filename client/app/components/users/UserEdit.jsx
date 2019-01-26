import React from 'react';
import { react2angular } from 'react2angular';
import { UserProfile } from '../proptypes';
import { DynamicForm } from '../dynamic-form/DynamicForm';

export const UserEdit = ({ user }) => {
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
      <DynamicForm fields={formFields} />
    </div>
  );
};

UserEdit.propTypes = {
  user: UserProfile.isRequired,
};

export default function init(ngModule) {
  ngModule.component('userEdit', react2angular(UserEdit));
}

init.init = true;
