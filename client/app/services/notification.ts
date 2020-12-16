import notification from "antd/lib/notification";

notification.config({
  placement: "bottomRight",
  duration: 3,
});

const simpleNotification = {};

["success", "error", "info", "warning", "warn"].forEach(action => {
  // eslint-disable-next-line arrow-body-style
  simpleNotification[action] = (message, description = null, props = null) => {
    return notification[action]({ ...props, message, description });
  };
});

export default {
  // export Ant's notification and replace actions
  ...notification,
  ...simpleNotification,
};
