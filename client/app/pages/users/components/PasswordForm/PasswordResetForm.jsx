import React, { useState, useCallback } from "react";
import Button from "antd/lib/button";
import { UserProfile } from "@/components/proptypes";
import User from "@/services/user";
import PasswordLinkAlert from "./PasswordLinkAlert";

export default function PasswordResetForm({ user }) {
  const [loading, setLoading] = useState(false);
  const [passwordLink, setPasswordLink] = useState(null);

  const sendPasswordReset = useCallback(() => {
    setLoading(true);
    User.sendPasswordReset(user)
      .then(passwordLink => {
        setPasswordLink(passwordLink);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  return (
    <React.Fragment>
      <Button className="w-100 m-t-10" onClick={sendPasswordReset} loading={loading}>
        Send Password Reset Email
      </Button>
      <PasswordLinkAlert user={user} passwordLink={passwordLink} afterClose={() => setPasswordLink(null)} />
    </React.Fragment>
  );
}

PasswordResetForm.propTypes = {
  user: UserProfile.isRequired,
};
