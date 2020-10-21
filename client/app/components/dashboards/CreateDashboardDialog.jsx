import { trim } from "lodash";
import React, { useState } from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import DynamicComponent from "@/components/DynamicComponent";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import recordEvent from "@/services/recordEvent";
import { policy } from "@/services/policy";
import { Dashboard } from "@/services/dashboard";
import notification from "@/services/notification";

function CreateDashboardDialog({ dialog }) {
  const isCreateDashboardEnabled = policy.isCreateDashboardEnabled();

  const [name, setName] = useState("");
  const isNameValid = name !== "";

  const saveInProgress = dialog.props.okButtonProps.loading || dialog.props.cancelButtonProps.loading;

  const save = () => {
    if (isNameValid) {
      dialog.close(
        Dashboard.save({ name })
          .then(data => {
            recordEvent("create", "dashboard");
            navigateTo(`${data.url}?edit`);
          })
          .catch(error => {
            notification.error("Failed to create dashboard", error.message);
            return Promise.reject(error);
          })
      );
    }
  };

  return (
    <Modal
      {...dialog.props}
      {...(isCreateDashboardEnabled ? {} : { footer: null })}
      title="New Dashboard"
      okText="Save"
      cancelText="Close"
      okButtonProps={{
        ...dialog.props.okButtonProps,
        disabled: !isNameValid || dialog.props.okButtonProps.disabled,
        "data-test": "DashboardSaveButton",
      }}
      onOk={save}
      wrapProps={{
        "data-test": "CreateDashboardDialog",
      }}>
      <DynamicComponent name="CreateDashboardDialogExtra" disabled={!isCreateDashboardEnabled}>
        <Input
          defaultValue={name}
          onChange={event => setName(trim(event.target.value))}
          onPressEnter={save}
          placeholder="Dashboard Name"
          disabled={saveInProgress}
          autoFocus
        />
      </DynamicComponent>
    </Modal>
  );
}

CreateDashboardDialog.propTypes = {
  dialog: DialogPropType.isRequired,
};

export default wrapDialog(CreateDashboardDialog);
