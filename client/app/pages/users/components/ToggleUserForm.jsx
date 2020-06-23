import React, { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import { UserProfile } from "@/components/proptypes";
import { currentUser } from "@/services/auth";
import User from "@/services/user";

export default function ToggleUserForm({ user, onChange }) {
  const [loading, setLoading] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const toggleUser = useCallback(() => {
    const action = user.isDisabled ? User.enableUser : User.disableUser;
    setLoading(true);
    action(user)
      .then(data => {
        if (data) {
          onChangeRef.current(User.convertUserInfo(data));
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (!currentUser.isAdmin || user.id === currentUser.id) {
    return null;
  }

  return user.isDisabled ? (
    <Button className="w-100 m-t-10" type="primary" onClick={toggleUser} loading={loading}>
      Enable User
    </Button>
  ) : (
    <Button className="w-100 m-t-10" type="danger" onClick={toggleUser} loading={loading}>
      Disable User
    </Button>
  );
}

ToggleUserForm.propTypes = {
  user: UserProfile.isRequired,
  onChange: PropTypes.func,
};

ToggleUserForm.defaultProps = {
  onChange: () => {},
};
