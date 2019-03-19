import notification from 'antd/lib/notification';

notification.config({
  placement: 'bottomRight',
  duration: 3,
});

const updatedActions = [
  'success',
  'error',
  'info',
  'warning',
  'warn',
].reduce((acc, action) => ({
  ...acc,
  [action]: (message, description = null, props = null) => notification[action]({ ...props, message, description }),
}), null);

export default { // export Ant's notification and replace actions
  ...notification,
  ...updatedActions,
};
