import notification from "@/services/notification";

function addOnlineListener(notificationKey: any) {
  function onlineStateHandler() {
    notification.close(notificationKey);
    window.removeEventListener("online", onlineStateHandler);
  }
  window.addEventListener("online", onlineStateHandler);
}

export default {
  init() {
    window.addEventListener("offline", () => {
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 1 arguments, but got 3.
      notification.warning("Please check your Internet connection.", null, {
        key: "connectionNotification",
        duration: null,
      });
      addOnlineListener("connectionNotification");
    });
  },
};
