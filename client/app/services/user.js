import { isString, get, find } from "lodash";
import sanitize from "@/services/sanitize";
import { axios } from "@/services/axios";
import notification from "@/services/notification";
import { clientConfig } from "@/services/auth";

function getErrorMessage(error) {
  return find([get(error, "response.data.message"), get(error, "response.statusText"), "Unknown error"], isString);
}

function disableResource(user) {
  return `api/users/${user.id}/disable`;
}

function enableUser(user) {
  const userName = sanitize(user.name);

  return axios
    .delete(disableResource(user))
    .then(data => {
      notification.success(`User ${userName} is now enabled.`);
      user.is_disabled = false;
      user.profile_image_url = data.profile_image_url;
      return data;
    })
    .catch(error => {
      notification.error("Cannot enable user", getErrorMessage(error));
    });
}

function disableUser(user) {
  const userName = sanitize(user.name);
  return axios
    .post(disableResource(user))
    .then(data => {
      notification.warning(`User ${userName} is now disabled.`);
      user.is_disabled = true;
      user.profile_image_url = data.profile_image_url;
      return data;
    })
    .catch(error => {
      notification.error("Cannot disable user", getErrorMessage(error));
    });
}

function deleteUser(user) {
  const userName = sanitize(user.name);
  return axios
    .delete(`api/users/${user.id}`)
    .then(data => {
      notification.warning(`User ${userName} has been deleted.`);
      return data;
    })
    .catch(error => {
      notification.error("Cannot delete user", getErrorMessage(error));
    });
}

function convertUserInfo(user) {
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

function regenerateApiKey(user) {
  return axios
    .post(`api/users/${user.id}/regenerate_api_key`)
    .then(data => {
      notification.success("The API Key has been updated.");
      return data.api_key;
    })
    .catch(error => {
      notification.error("Failed regenerating API Key", getErrorMessage(error));
    });
}

function sendPasswordReset(user) {
  return axios
    .post(`api/users/${user.id}/reset_password`)
    .then(data => {
      if (clientConfig.mailSettingsMissing) {
        notification.warning("The mail server is not configured.");
        return data.reset_link;
      }
      notification.success("Password reset email sent.");
    })
    .catch(error => {
      notification.error("Failed to send password reset email", getErrorMessage(error));
    });
}

function resendInvitation(user) {
  return axios
    .post(`api/users/${user.id}/invite`)
    .then(data => {
      if (clientConfig.mailSettingsMissing) {
        notification.warning("The mail server is not configured.");
        return data.invite_link;
      }
      notification.success("Invitation sent.");
    })
    .catch(error => {
      notification.error("Failed to resend invitation", getErrorMessage(error));
    });
}

const User = {
  query: params => axios.get("api/users", { params }),
  get: ({ id }) => axios.get(`api/users/${id}`),
  create: data => axios.post(`api/users`, data),
  save: data => axios.post(`api/users/${data.id}`, data),
  enableUser,
  disableUser,
  deleteUser,
  convertUserInfo,
  regenerateApiKey,
  sendPasswordReset,
  resendInvitation,
};

export default User;
