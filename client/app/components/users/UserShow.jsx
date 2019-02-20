import React from 'react';
import { react2angular } from 'react2angular';
import { includes } from 'lodash';
import Tag from 'antd/lib/tag';
import { Group } from '@/services/group';
import navigateTo from '@/services/navigateTo';
import { UserProfile } from '../proptypes';

export class UserShow extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { groups: [], loadingGroups: true };

    Group.query((groups) => {
      this.setState({ groups, loadingGroups: false });
    });
  }

  renderUserGroups() {
    const { groupIds } = this.props.user;
    const { groups } = this.state;

    return (
      <div className="m-t-5">
        {groups.filter(group => includes(groupIds, group.id)).map((group => (
          <Tag key={group.id} onClick={() => navigateTo(`groups/${group.id}`)}>{group.name}</Tag>
        )))}
      </div>
    );
  }

  render() {
    const { name, email, profileImageUrl } = this.props.user;
    const { loadingGroups } = this.state;

    return (
      <div className="col-md-4 col-md-offset-4 profile__container">
        <img
          alt="profile"
          src={profileImageUrl}
          className="profile__image"
          width="40"
        />

        <h3 className="profile__h3">{name}</h3>

        <hr />

        <dl className="profile__dl">
          <dt>Name:</dt>
          <dd>{name}</dd>
          <dt>Email:</dt>
          <dd>{email}</dd>
          <dt>Groups:</dt>
          <dd>{loadingGroups ? 'Loading...' : this.renderUserGroups()}</dd>
        </dl>
      </div>
    );
  }
}

export default function init(ngModule) {
  ngModule.component('userShow', react2angular(UserShow));
}

init.init = true;
