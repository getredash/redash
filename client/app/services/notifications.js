import { find } from "lodash";
import debug from "debug";
import recordEvent from "@/services/recordEvent";
import redashIconUrl from "@/assets/images/redash_icon_small.png";

const logger = debug("redash:notifications");

const Notification = window.Notification || null;
if (!Notification) {
  logger("HTML5 notifications are not supported.");
}

const hidden = find(["hidden", "webkitHidden", "mozHidden", "msHidden"], prop => prop in document);

function isPageVisible() {
  return !document[hidden];
}

function getPermissions() {
  if (Notification && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification(title, content) {
  if (!Notification || isPageVisible() || Notification.permission !== "granted") {
    return;
  }

  // using the 'tag' to avoid showing duplicate notifications
  const notification = new Notification(title, {
    tag: title + content,
    body: content,
    icon: redashIconUrl,
  });
  setTimeout(() => {
    notification.close();
  }, 3000);
  notification.onclick = function onClick() {
    window.focus();
    this.close();
    recordEvent("click", "notification");
  };
}

export default {
  getPermissions,
  showNotification,
};
