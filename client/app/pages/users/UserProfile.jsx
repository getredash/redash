import React from "react";
import PropTypes from "prop-types";
import { react2angular } from "react2angular";

import EmailSettingsWarning from "@/components/EmailSettingsWarning";
import UserEdit from "@/components/users/UserEdit";
import UserShow from "@/components/users/UserShow";
import LoadingState from "@/components/items-list/components/LoadingState";
import wrapSettingsTab from "@/components/SettingsWrapper";

import { User } from "@/services/user";
import { $route } from "@/services/ng";
import { currentUser } from "@/services/auth";
import PromiseRejectionError from "@/lib/promise-rejection-error";
import "./settings.less";

class UserProfile extends React.Component {
  static propTypes = {
    onError: PropTypes.func,
  };

  static defaultProps = {
    onError: () => {},
  };

  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  componentDidMount() {
    const userId = $route.current.params.userId || currentUser.id;
    User.get({ id: userId })
      .$promise.then(user => this.setState({ user: User.convertUserInfo(user) }))
      .catch(error => {
        // ANGULAR_REMOVE_ME This code is related to Angular's HTTP services
        if (error.status && error.data) {
          error = new PromiseRejectionError(error);
        }
        this.props.onError(error);
      });
  }

  render() {
    const { user } = this.state;
    const canEdit = user && (currentUser.isAdmin || currentUser.id === user.id);
    const UserComponent = canEdit ? UserEdit : UserShow;
    return (
      <React.Fragment>
        <EmailSettingsWarning featureName="invite emails" className="m-b-20" adminOnly />
        <div className="row">{user ? <UserComponent user={user} /> : <LoadingState className="" />}</div>
      </React.Fragment>
    );
  }
}

export default function init(ngModule) {
  ngModule.component(
    "pageUserProfile",
    react2angular(
      wrapSettingsTab(
        {
          title: "Account",
          path: "users/me",
          order: 7,
        },
        UserProfile
      )
    )
  );
}

init.init = true;
