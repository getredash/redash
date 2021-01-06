import React from "react";
import { UserProfile } from "@/components/proptypes";
import UserGroups from "@/components/UserGroups";

import useUserGroups from "../hooks/useUserGroups";

export default function ReadOnlyUserProfile({ user }) {
  const { groups, isLoading: isLoadingGroups } = useUserGroups(user);

  return (
    <div className="col-md-4 col-md-offset-4 profile__container">
      <img alt="profile" src={user.profileImageUrl} className="profile__image" width="40" />
      <h3 className="profile__h3">{user.name}</h3>
      <hr />
      <dl className="profile__dl">
        <dt>Name:</dt>
        <dd>{user.name}</dd>
        <dt>Email:</dt>
        <dd>{user.email}</dd>
        <dt className="m-b-5">Groups:</dt>
        <dd>{isLoadingGroups ? "Loading..." : <UserGroups groups={groups} />}</dd>
      </dl>
    </div>
  );
}

ReadOnlyUserProfile.propTypes = {
  user: UserProfile.isRequired,
};
