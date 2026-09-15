import { get, map } from "lodash";
import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";

import i18next from "i18next";
import { useTranslation } from "react-i18next";

import { UserProfile } from "@/components/proptypes";
import DynamicComponent from "@/components/DynamicComponent";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import UserGroups from "@/components/UserGroups";

import User from "@/services/user";
import { currentUser } from "@/services/auth";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

import useUserGroups from "../hooks/useUserGroups";

export default function UserInfoForm(props) {
  const { t } = useTranslation();
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
        .then((user) => {
          successCallback(t("Saved."));
          handleChange(User.convertUserInfo(user));
        })
        .catch((error) => {
          errorCallback(get(error, "response.data.message", t("Failed saving.")));
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
            title: t("Name"),
            type: "text",
            initialValue: user.name,
          },
          {
            name: "email",
            title: t("Users:Email"),
            type: "email",
            initialValue: user.email,
            readOnly: true,
          },
          !user.isDisabled && currentUser.id !== user.id
            ? {
                name: "group_ids",
                title: t("Users:Groups"),
                type: "select",
                mode: "multiple",
                options: map(allGroups, (group) => ({ name: group.name, value: group.id })),
                initialValue: user.groupIds,
                loading: isLoadingGroups,
                placeholder: isLoadingGroups ? t("Loading...") : "",
              }
            : {
                name: "group_ids",
                title: t("Users:Groups"),
                type: "content",
                required: false,
                content: isLoadingGroups ? t("Loading...") : <UserGroups data-test="Groups" groups={groups} />,
              },
        ],
        (field) => ({ readOnly: user.isDisabled, required: true, ...field })
      ),
    [user, groups, allGroups, isLoadingGroups]
  );

  return (
    <DynamicComponent name="UserProfile.UserInfoForm" {...props}>
      <DynamicForm fields={formFields} onSubmit={saveUser} hideSubmitButton={user.isDisabled} />
    </DynamicComponent>
  );
}

UserInfoForm.propTypes = {
  user: UserProfile.isRequired,
  onChange: PropTypes.func,
};

UserInfoForm.defaultProps = {
  onChange: () => {},
};
