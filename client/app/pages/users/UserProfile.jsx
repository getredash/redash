import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import EmailSettingsWarning from "@/components/EmailSettingsWarning";
import DynamicComponent from "@/components/DynamicComponent";
import LoadingState from "@/components/items-list/components/LoadingState";
import wrapSettingsTab from "@/components/SettingsWrapper";

import User from "@/services/user";
import { currentUser } from "@/services/auth";
import routes from "@/services/routes";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

import EditableUserProfile from "./components/EditableUserProfile";
import ReadOnlyUserProfile from "./components/ReadOnlyUserProfile";

import "./settings.less";

function UserProfile({ userId, onError }) {
  const [user, setUser] = useState(null);

  const handleError = useImmutableCallback(onError);

  useEffect(() => {
    let isCancelled = false;
    User.get({ id: userId || currentUser.id })
      .then(user => {
        if (!isCancelled) {
          setUser(User.convertUserInfo(user));
        }
      })
      .catch(error => {
        if (!isCancelled) {
          handleError(error);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [userId, handleError]);

  const canEdit = user && (currentUser.isAdmin || currentUser.id === user.id);
  return (
    <React.Fragment>
      <EmailSettingsWarning featureName="invite emails" className="m-b-20" adminOnly />
      <div className="row">
        {!user && <LoadingState className="" />}
        {user && (
          <DynamicComponent name="UserProfile" user={user}>
            {!canEdit && <ReadOnlyUserProfile user={user} />}
            {canEdit && <EditableUserProfile user={user} />}
          </DynamicComponent>
        )}
      </div>
    </React.Fragment>
  );
}

UserProfile.propTypes = {
  userId: PropTypes.string,
  onError: PropTypes.func,
};

UserProfile.defaultProps = {
  userId: null, // defaults to `currentUser.id`
  onError: () => {},
};

const UserProfilePage = wrapSettingsTab(
  "Users.Account",
  {
    title: "Account",
    path: "users/me",
    order: 7,
  },
  UserProfile
);

routes.register(
  "Users.Account",
  routeWithUserSession({
    path: "/users/me",
    title: "Account",
    render: pageProps => <UserProfilePage {...pageProps} />,
  })
);
routes.register(
  "Users.ViewOrEdit",
  routeWithUserSession({
    path: "/users/:userId",
    title: "Users",
    render: pageProps => <UserProfilePage {...pageProps} />,
  })
);
