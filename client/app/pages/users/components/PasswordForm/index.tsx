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
    // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    return (<DynamicComponent name="UserProfile.PasswordForm" {...props}>
      <h5>Password</h5>
      {user.id === (currentUser as any).id && (<Button className="w-100 m-t-10" onClick={changePassword} data-test="ChangePassword">
          Change Password
        </Button>)}
      {user.id !== (currentUser as any).id && currentUser.isAdmin && (<React.Fragment>
          {(user as any).isInvitationPending ? <ResendInvitationForm user={user}/> : <PasswordResetForm user={user}/>}
        </React.Fragment>)}
    </DynamicComponent>);
}
