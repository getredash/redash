import React from "react";
import Modal from "antd/lib/modal";
import { Auth } from "@/services/auth";

const SESSION_RESTORED_MESSAGE = "redash_session_restored";

export function notifySessionRestored() {
  if (window.opener) {
    window.opener.postMessage({ type: SESSION_RESTORED_MESSAGE }, window.location.origin);
  }
}

function showRestoreSessionPrompt(loginUrl, onSuccess) {
  let popup = null;

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

      popup = window.open(
        loginUrl,
        "Restore Session",
        "width=800,height=600,left=300,top=200,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes,status=yes"
      );

      const handlePostMessage = event => {
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

let restoreSessionPromise = null;

export function restoreSession() {
  if (!restoreSessionPromise) {
    let resolvePromise = () => {};
    restoreSessionPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    showRestoreSessionPrompt(Auth.getLoginUrl(), () => {
      restoreSessionPromise = null;
      resolvePromise();
    });
  }

  return restoreSessionPromise;
}
