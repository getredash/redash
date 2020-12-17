import { map } from "lodash";
import React from "react";
import Modal from "antd/lib/modal";
import { Auth } from "@/services/auth";

const SESSION_RESTORED_MESSAGE = "redash_session_restored";

export function notifySessionRestored() {
  if (window.opener) {
    window.opener.postMessage({ type: SESSION_RESTORED_MESSAGE }, window.location.origin);
  }
}

function getPopupPosition(width: any, height: any) {
  const windowLeft = window.screenX;
  const windowTop = window.screenY;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  return {
    left: Math.floor((windowWidth - width) / 2 + windowLeft),
    top: Math.floor((windowHeight - height) / 2 + windowTop),
    width: Math.floor(width),
    height: Math.floor(height),
  };
}

function showRestoreSessionPrompt(loginUrl: any, onSuccess: any) {
  let popup: any = null;

  Modal.warning({
    content: "Your session has expired. Please login to continue.",
    okText: (
      <React.Fragment>
        <i className="fa fa-external-link m-r-5" />
        Login
      </React.Fragment>
    ),
    centered: true,
    mask: true,
    maskClosable: false,
    keyboard: false,
    onOk: closeModal => {
      if (popup && !popup.closed) {
        popup.focus();
        return; // popup already shown
      }

      const popupOptions = {
        ...getPopupPosition(640, 640),
        menubar: "no",
        toolbar: "no",
        location: "yes",
        resizable: "yes",
        scrollbars: "yes",
        status: "yes",
      };

      popup = window.open(loginUrl, "Restore Session", map(popupOptions, (value, key) => `${key}=${value}`).join(","));

      const handlePostMessage = (event: any) => {
        if (event.data.type === SESSION_RESTORED_MESSAGE) {
          if (popup) {
            popup.close();
          }
          popup = null;
          window.removeEventListener("message", handlePostMessage);
          closeModal();
          onSuccess();
        }
      };

      window.addEventListener("message", handlePostMessage, false);
    },
  });
}

let restoreSessionPromise: any = null;

export function restoreSession() {
  if (!restoreSessionPromise) {
    restoreSessionPromise = new Promise(resolve => {
      showRestoreSessionPrompt(Auth.getLoginUrl(), () => {
        restoreSessionPromise = null;
        // @ts-expect-error ts-migrate(2794) FIXME: Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        resolve();
      });
    });
  }

  return restoreSessionPromise;
}
