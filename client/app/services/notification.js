import notification from "antd/lib/notification";

notification.config({
  placement: "bottomRight",
  duration: 3,
});

const simpleNotification = {};
const notificationActionAliases = {
  warn: "warning",
};

["success", "error", "info", "warning", "warn"].forEach((action) => {
  // eslint-disable-next-line arrow-body-style
  simpleNotification[action] = (message, description = null, props = null) => {
    const handler = notification[notificationActionAliases[action] || action];
    return handler({ ...props, message, description });
  };
});

export default {
  // export Ant's notification and replace actions
  ...notification,
  ...simpleNotification,
};
