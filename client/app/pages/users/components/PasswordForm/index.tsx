import React, { useCallback } from "react";
import Button from "antd/lib/button";
import DynamicComponent from "@/components/DynamicComponent";
import { UserProfile } from "@/components/proptypes";
import { currentUser } from "@/services/auth";

import ChangePasswordDialog from "./ChangePasswordDialog";
import PasswordResetForm from "./PasswordResetForm";
import ResendInvitationForm from "./ResendInvitationForm";

type Props = {
    user: UserProfile;
};

export default function PasswordForm(props: Props) {
  const { user } = props;

  const changePassword = useCallback(() => {
    ChangePasswordDialog.showModal({ user });
  }, [user]);

  return (
    // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <DynamicComponent name="UserProfile.PasswordForm" {...props}>
      <h5>Password</h5>
      {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type '{ _isAdmin: ... Remove this comment to see the full error message */}
      {user.id === currentUser.id && (
        <Button className="w-100 m-t-10" onClick={changePassword} data-test="ChangePassword">
          Change Password
        </Button>
      )}
      {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type '{ _isAdmin: ... Remove this comment to see the full error message */}
      {user.id !== currentUser.id && currentUser.isAdmin && (
        <React.Fragment>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'isInvitationPending' does not exist on t... Remove this comment to see the full error message */}
          {user.isInvitationPending ? <ResendInvitationForm user={user} /> : <PasswordResetForm user={user} />}
        </React.Fragment>
      )}
    </DynamicComponent>
  );
}
