import React, { useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import Modal from "antd/lib/modal";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { Auth } from "@/services/auth";

const SESSION_RESTORED_MESSAGE = "redash_session_restored";

export function notifySessionRestored() {
  if (window.opener) {
    window.opener.postMessage({ type: SESSION_RESTORED_MESSAGE }, window.location.origin);
  }
}

function RestoreSessionDialogComponent({ dialog, loginUrl }) {
  const dialogRef = useRef(null);
  dialogRef.current = dialog;

  const popupRef = useRef(null);

  const handleRestoreSessionClick = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return; // popup already shown
    }

    popupRef.current = window.open(
      loginUrl,
      "Restore Session",
      "width=800,height=600,left=300,top=200,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes,status=yes"
    );
  }, [loginUrl]);

  useEffect(() => {
    let handlePostMessage = event => {
      if (event.data.type === SESSION_RESTORED_MESSAGE) {
        if (popupRef.current) {
          popupRef.current.close();
        }
        popupRef.current = null;
        dialogRef.current.close();
      }
    };

    window.addEventListener("message", handlePostMessage, false);

    return () => {
      window.removeEventListener("message", handlePostMessage);
    };
  }, []);

  return (
    <Modal {...dialog.props} centered closable={false} maskClosable={false} footer={false}>
      <h3 className="text-center">Your session has expired.</h3>
      <h3 className="text-center">
        Click <a onClick={handleRestoreSessionClick}>here</a> to restore it.
      </h3>
    </Modal>
  );
}

RestoreSessionDialogComponent.propTypes = {
  dialog: DialogPropType.isRequired,
  loginUrl: PropTypes.string.isRequired,
};

const RestoreSessionDialog = wrapDialog(RestoreSessionDialogComponent);

let restoreSessionPromise = null;

export function restoreSession() {
  if (!restoreSessionPromise) {
    let resolvePromise = () => {};
    restoreSessionPromise = new Promise(resolve => {
      resolvePromise = resolve;
    });

    RestoreSessionDialog.showModal({ loginUrl: Auth.getLoginUrl() }).onClose(() => {
      restoreSessionPromise = null;
      resolvePromise();
    });
  }

  return restoreSessionPromise;
}
