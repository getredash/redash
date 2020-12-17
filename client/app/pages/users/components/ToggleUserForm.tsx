import React, { useState, useCallback } from "react";
import Button from "antd/lib/button";
import DynamicComponent from "@/components/DynamicComponent";
import { UserProfile } from "@/components/proptypes";
import { currentUser } from "@/services/auth";
import User from "@/services/user";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";
type OwnProps = {
    user: UserProfile;
    onChange?: (...args: any[]) => any;
};
type Props = OwnProps & typeof ToggleUserForm.defaultProps;
export default function ToggleUserForm(props: Props) {
    const { user, onChange } = props;
    const [loading, setLoading] = useState(false);
    const handleChange = useImmutableCallback(onChange);
    const toggleUser = useCallback(() => {
        const action = user.isDisabled ? User.enableUser : User.disableUser;
        setLoading(true);
        action(user)
            .then(data => {
            if (data) {
                handleChange(User.convertUserInfo(data));
            }
        })
            .finally(() => {
            setLoading(false);
        });
    }, [user, handleChange]);
    if (!currentUser.isAdmin || user.id === (currentUser as any).id) {
        return null;
    }
    const buttonProps = {
        type: user.isDisabled ? "primary" : "danger",
        children: user.isDisabled ? "Enable User" : "Disable User",
    };
    return (<DynamicComponent name="UserProfile.ToggleUserForm">
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <Button className="w-100 m-t-10" onClick={toggleUser} loading={loading} {...buttonProps}/>
    </DynamicComponent>);
}
ToggleUserForm.defaultProps = {
    onChange: () => { },
};
