import React, { useState, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import DynamicComponent from "@/components/DynamicComponent";
import { UserProfile } from "@/components/proptypes";
import { currentUser } from "@/services/auth";
import User from "@/services/user";

export default function ToggleUserForm(props) {
  const { user, onChange } = props;

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

  const buttonProps = {
    type: user.isDisabled ? "primary" : "danger",
    children: user.isDisabled ? "Enable User" : "Disable User",
  };

  return (
    <DynamicComponent name="UserProfile.ToggleUserForm">
      <Button className="w-100 m-t-10" onClick={toggleUser} loading={loading} {...buttonProps} />
    </DynamicComponent>
  );
}

ToggleUserForm.propTypes = {
  user: UserProfile.isRequired,
  onChange: PropTypes.func,
};

ToggleUserForm.defaultProps = {
  onChange: () => {},
};
