import { isString, get, find } from "lodash";
import sanitize from "@/services/sanitize";
import { axios } from "@/services/axios";
import notification from "@/services/notification";
import { clientConfig } from "@/services/auth";

function getErrorMessage(error: any) {
  return find([get(error, "response.data.message"), get(error, "response.statusText"), "Unknown error"], isString);
}

function disableResource(user: any) {
  return `api/users/${user.id}/disable`;
}

function enableUser(user: any) {
  const userName = sanitize(user.name);

  return axios
    .delete(disableResource(user))
    .then(data => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.success(`User ${userName} is now enabled.`);
      user.is_disabled = false;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'profile_image_url' does not exist on typ... Remove this comment to see the full error message
      user.profile_image_url = data.profile_image_url;
      return data;
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
      notification.error("Cannot enable user", getErrorMessage(error));
    });
}

function disableUser(user: any) {
  const userName = sanitize(user.name);
  return axios
    .post(disableResource(user))
    .then(data => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.warning(`User ${userName} is now disabled.`);
      user.is_disabled = true;
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'profile_image_url' does not exist on typ... Remove this comment to see the full error message
      user.profile_image_url = data.profile_image_url;
      return data;
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
      notification.error("Cannot disable user", getErrorMessage(error));
    });
}

function deleteUser(user: any) {
  const userName = sanitize(user.name);
  return axios
    .delete(`api/users/${user.id}`)
    .then(data => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.warning(`User ${userName} has been deleted.`);
      return data;
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
      notification.error("Cannot delete user", getErrorMessage(error));
    });
}

function convertUserInfo(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profileImageUrl: user.profile_image_url,
    apiKey: user.api_key,
    groupIds: user.groups,
    isDisabled: user.is_disabled,
    isInvitationPending: user.is_invitation_pending,
  };
}

function regenerateApiKey(user: any) {
  return axios
    .post(`api/users/${user.id}/regenerate_api_key`)
    .then(data => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.success("The API Key has been updated.");
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'api_key' does not exist on type 'AxiosRe... Remove this comment to see the full error message
      return data.api_key;
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
      notification.error("Failed regenerating API Key", getErrorMessage(error));
    });
}

function sendPasswordReset(user: any) {
  return axios
    .post(`api/users/${user.id}/reset_password`)
    .then(data => {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'mailSettingsMissing' does not exist on t... Remove this comment to see the full error message
      if (clientConfig.mailSettingsMissing) {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.warning("The mail server is not configured.");
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'reset_link' does not exist on type 'Axio... Remove this comment to see the full error message
        return data.reset_link;
      }
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.success("Password reset email sent.");
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
      notification.error("Failed to send password reset email", getErrorMessage(error));
    });
}

function resendInvitation(user: any) {
  return axios
    .post(`api/users/${user.id}/invite`)
    .then(data => {
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'mailSettingsMissing' does not exist on t... Remove this comment to see the full error message
      if (clientConfig.mailSettingsMissing) {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.warning("The mail server is not configured.");
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'invite_link' does not exist on type 'Axi... Remove this comment to see the full error message
        return data.invite_link;
      }
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
      notification.success("Invitation sent.");
    })
    .catch(error => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 2.
      notification.error("Failed to resend invitation", getErrorMessage(error));
    });
}

const User = {
  query: (params: any) => axios.get("api/users", { params }),
  get: ({
    id
  }: any) => axios.get(`api/users/${id}`),
  create: (data: any) => axios.post(`api/users`, data),
  save: (data: any) => axios.post(`api/users/${data.id}`, data),
  enableUser,
  disableUser,
  deleteUser,
  convertUserInfo,
  regenerateApiKey,
  sendPasswordReset,
  resendInvitation,
};

export default User;
