import React, { useCallback } from "react";
import Button from "antd/lib/button";
import DynamicComponent from "@/components/DynamicComponent";
import { UserProfile } from "@/components/proptypes";
import { currentUser } from "@/services/auth";

import ChangePasswordDialog from "./ChangePasswordDialog";
import PasswordResetForm from "./PasswordResetForm";
import ResendInvitationForm from "./ResendInvitationForm";

export default function PasswordForm(props) {
  const { user } = props;

  const changePassword = useCallback(() => {
    ChangePasswordDialog.showModal({ user });
  }, [user]);

  return (
    <DynamicComponent name="UserProfile.PasswordForm" {...props}>
      <h5>Password</h5>
      {user.id === currentUser.id && (
        <Button className="w-100 m-t-10" onClick={changePassword} data-test="ChangePassword">
          Change Password
        </Button>
      )}
      {user.id !== currentUser.id && currentUser.isAdmin && (
        <React.Fragment>
          {user.isInvitationPending ? <ResendInvitationForm user={user} /> : <PasswordResetForm user={user} />}
        </React.Fragment>
      )}
    </DynamicComponent>
  );
}

PasswordForm.propTypes = {
  user: UserProfile.isRequired,
};
