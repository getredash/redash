import notification from "antd/lib/notification";

notification.config({
  placement: "bottomRight",
  duration: 3,
});

const simpleNotification = {};

["success", "error", "info", "warning", "warn"].forEach(action => {
  // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
  // eslint-disable-next-line arrow-body-style
  simpleNotification[action] = (message: any, description = null, props = null) => {
    // @ts-expect-error ts-migrate(7053) FIXME: Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    return notification[action]({ ...props, message, description });
  };
});

export default {
  // export Ant's notification and replace actions
  ...notification,
  ...simpleNotification,
};
