import { NotificationApi, ArgsProps } from "antd/lib/notification";

export type NotificationConfig = Omit<ArgsProps, "message" | "description"> | null;

type NotificationFunction = (
  message: ArgsProps["message"],
  description?: ArgsProps["description"],
  args?: NotificationConfig
) => void;

declare const notification: NotificationApi & {
  success: NotificationFunction;
  error: NotificationFunction;
  info: NotificationFunction;
  warning: NotificationFunction;
  warn: NotificationFunction;
};

export default notification;
