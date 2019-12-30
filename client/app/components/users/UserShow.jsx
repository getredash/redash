import React from "react";
import { includes } from "lodash";
import Tag from "antd/lib/tag";
import { Group } from "@/services/group";
import { UserProfile } from "../proptypes";

export default class UserShow extends React.Component {
  static propTypes = {
    user: UserProfile.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { groups: [], loadingGroups: true };
  }

  componentDidMount() {
    Group.query(groups => {
      this.setState({ groups, loadingGroups: false });
    });
  }

  renderUserGroups() {
    const { groupIds } = this.props.user;
    const { groups } = this.state;

    return (
      <div>
        {groups
          .filter(group => includes(groupIds, group.id))
          .map(group => (
            <Tag className="m-t-5 m-r-5" key={group.id}>
              <a href={`groups/${group.id}`}>{group.name}</a>
            </Tag>
          ))}
      </div>
    );
  }

  render() {
    const { name, email, profileImageUrl } = this.props.user;
    const { loadingGroups } = this.state;

    return (
      <div className="col-md-4 col-md-offset-4 profile__container">
        <img alt="profile" src={profileImageUrl} className="profile__image" width="40" />

        <h3 className="profile__h3">{name}</h3>

        <hr />

        <dl className="profile__dl">
          <dt>Name:</dt>
          <dd>{name}</dd>
          <dt>Email:</dt>
          <dd>{email}</dd>
          <dt>Groups:</dt>
          <dd>{loadingGroups ? "Loading..." : this.renderUserGroups()}</dd>
        </dl>
      </div>
    );
  }
}
