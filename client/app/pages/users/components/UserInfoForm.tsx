import { get, map } from "lodash";
import React, { useMemo, useCallback } from "react";
import { UserProfile } from "@/components/proptypes";
import DynamicComponent from "@/components/DynamicComponent";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import UserGroups from "@/components/UserGroups";

import User from "@/services/user";
import { currentUser } from "@/services/auth";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

import useUserGroups from "../hooks/useUserGroups";

type OwnProps = {
    user: UserProfile;
    onChange?: (...args: any[]) => any;
};

type Props = OwnProps & typeof UserInfoForm.defaultProps;

export default function UserInfoForm(props: Props) {
  const { user, onChange } = props;

  const { groups, allGroups, isLoading: isLoadingGroups } = useUserGroups(user);

  const handleChange = useImmutableCallback(onChange);

  const saveUser = useCallback(
    (values, successCallback, errorCallback) => {
      const data = {
        ...values,
        id: user.id,
      };

      User.save(data)
        .then(user => {
          successCallback("Saved.");
          handleChange(User.convertUserInfo(user));
        })
        .catch(error => {
          errorCallback(get(error, "response.data.message", "Failed saving."));
        });
    },
    [user, handleChange]
  );

  const formFields = useMemo(
    () =>
      map(
        [
          {
            name: "name",
            title: "Name",
            type: "text",
            initialValue: user.name,
          },
          {
            name: "email",
            title: "Email",
            type: "email",
            initialValue: user.email,
          },
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type '{ _isAdmin: ... Remove this comment to see the full error message
          !user.isDisabled && currentUser.id !== user.id
            ? {
                name: "group_ids",
                title: "Groups",
                type: "select",
                mode: "multiple",
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'name' does not exist on type 'never'.
                options: map(allGroups, group => ({ name: group.name, value: group.id })),
                // @ts-expect-error ts-migrate(2339) FIXME: Property 'id' does not exist on type 'never'.
                initialValue: map(groups, group => group.id),
                loading: isLoadingGroups,
                placeholder: isLoadingGroups ? "Loading..." : "",
              }
            : {
                name: "group_ids",
                title: "Groups",
                type: "content",
                required: false,
                content: isLoadingGroups ? "Loading..." : <UserGroups data-test="Groups" groups={groups} />,
              },
        ],
        field => ({ readOnly: user.isDisabled, required: true, ...field })
      ),
    [user, groups, allGroups, isLoadingGroups]
  );

  return (
    <DynamicComponent name="UserProfile.UserInfoForm" {...props}>
      {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
      <DynamicForm fields={formFields} onSubmit={saveUser} hideSubmitButton={user.isDisabled} />
    </DynamicComponent>
  );
}

UserInfoForm.defaultProps = {
  onChange: () => {},
};
