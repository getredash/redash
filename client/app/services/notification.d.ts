import { NotificationApi, ArgsProps } from "antd/lib/notification";
type simpleFunc = (message: string, description?: string | null, args?: ArgsProps | null) => void;
declare const notification: NotificationApi & {
  success: simpleFunc;
  error: simpleFunc;
  info: simpleFunc;
  warning: simpleFunc;
  warn: simpleFunc;
};
export default notification;
