import { find } from "lodash";
import debug from "debug";
import recordEvent from "@/services/recordEvent";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module '@/assets/images/redash_icon_sm... Remove this comment to see the full error message
import redashIconUrl from "@/assets/images/redash_icon_small.png";

const logger = debug("redash:notifications");

const Notification = window.Notification || null;
if (!Notification) {
  logger("HTML5 notifications are not supported.");
}

const hidden = find(["hidden", "webkitHidden", "mozHidden", "msHidden"], prop => prop in document);

function isPageVisible() {
  // @ts-expect-error ts-migrate(2538) FIXME: Type 'undefined' cannot be used as an index type.
  return !document[hidden];
}

function getPermissions() {
  if (Notification && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification(title: any, content: any) {
  if (!Notification || isPageVisible() || Notification.permission !== "granted") {
    return;
  }

  // using the 'tag' to avoid showing duplicate notifications
  const notification = new Notification(title, {
    tag: title + content,
    body: content,
    icon: redashIconUrl,
  });
  notification.onclick = function onClick() {
    window.focus();
    this.close();
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 2.
    recordEvent("click", "notification");
  };
}

export default {
  getPermissions,
  showNotification,
};
