import { $http } from "@/services/ng";
import notification from "@/services/notification";

export default {
  get: () => $http.get("api/settings/organization").then(response => response.data),
  save: (data, message = "Settings changes saved.") =>
    $http
      .post("api/settings/organization", data)
      .then(response => {
        notification.success(message);
        return response.data;
      })
      .catch(() => {
        notification.error("Failed saving changes.");
      }),
};
