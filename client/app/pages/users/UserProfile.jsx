import React from "react";
import PropTypes from "prop-types";

import AuthenticatedPageWrapper from "@/components/ApplicationArea/AuthenticatedPageWrapper";
import EmailSettingsWarning from "@/components/EmailSettingsWarning";
import UserEdit from "@/components/users/UserEdit";
import UserShow from "@/components/users/UserShow";
import LoadingState from "@/components/items-list/components/LoadingState";
import wrapSettingsTab from "@/components/SettingsWrapper";
import { ErrorBoundaryContext } from "@/components/ErrorBoundary";
import User from "@/services/user";
import { currentUser } from "@/services/auth";
import "./settings.less";

class UserProfile extends React.Component {
  static propTypes = {
    userId: PropTypes.string,
    onError: PropTypes.func,
  };

  static defaultProps = {
    userId: null, // defaults to `currentUser.id`
    onError: () => {},
  };

  constructor(props) {
    super(props);
    this.state = { user: null };
  }

  componentDidMount() {
    const userId = this.props.userId || currentUser.id;
    User.get({ id: userId })
      .then(user => this.setState({ user: User.convertUserInfo(user) }))
      .catch(error => this.props.onError(error));
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

const UserProfilePage = wrapSettingsTab(
  {
    title: "Account",
    path: "users/me",
    order: 7,
  },
  UserProfile
);

export default [
  {
    path: "/users/me",
    title: "Account",
    render: currentRoute => (
      <AuthenticatedPageWrapper key={currentRoute.key}>
        <ErrorBoundaryContext.Consumer>
          {({ handleError }) => <UserProfilePage {...currentRoute.routeParams} onError={handleError} />}
        </ErrorBoundaryContext.Consumer>
      </AuthenticatedPageWrapper>
    ),
  },
  {
    path: "/users/:userId([0-9]+)",
    title: "Users",
    render: currentRoute => (
      <AuthenticatedPageWrapper key={currentRoute.key}>
        <ErrorBoundaryContext.Consumer>
          {({ handleError }) => <UserProfilePage {...currentRoute.routeParams} onError={handleError} />}
        </ErrorBoundaryContext.Consumer>
      </AuthenticatedPageWrapper>
    ),
  },
];
