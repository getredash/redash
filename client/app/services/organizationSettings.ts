import { axios } from "@/services/axios";
import notification from "@/services/notification";

export default {
  get: () => axios.get("api/settings/organization"),
  save: (data: any, message = "Settings changes saved.") =>
    axios
      .post("api/settings/organization", data)
      .then(data => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.success(message);
        return data;
      })
      .catch(() => {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        notification.error("Failed saving changes.");
      }),
};
