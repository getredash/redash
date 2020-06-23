import React, { useState, useCallback } from "react";
import Button from "antd/lib/button";
import { UserProfile } from "@/components/proptypes";
import User from "@/services/user";
import PasswordLinkAlert from "./PasswordLinkAlert";

export default function ResendInvitationForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [passwordLink, setPasswordLink] = useState(null);

  const resendInvitation = useCallback(() => {
    setLoading(true);

    User.resendInvitation(user)
      .then(passwordLink => {
        setPasswordLink(passwordLink);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  return (
    <React.Fragment>
      <Button className="w-100 m-t-10" onClick={resendInvitation} loading={loading}>
        Resend Invitation
      </Button>
      <PasswordLinkAlert user={user} passwordLink={passwordLink} afterClose={() => setPasswordLink(null)} />
    </React.Fragment>
  );
}

ResendInvitationForm.propTypes = {
  user: UserProfile.isRequired,
};
