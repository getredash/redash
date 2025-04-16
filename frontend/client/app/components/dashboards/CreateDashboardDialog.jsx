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

function CreateDashboardDialog({ dialog }) {
  const [name, setName] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const isCreateDashboardEnabled = policy.isCreateDashboardEnabled();

  function handleNameChange(event) {
    const value = trim(event.target.value);
    setName(value);
    setIsValid(value !== "");
  }

  function save() {
    if (name !== "") {
      setSaveInProgress(true);

      Dashboard.save({ name }).then(data => {
        dialog.close();
        navigateTo(`${data.url}?edit`);
      });
      recordEvent("create", "dashboard");
    }
  }

  return (
    <Modal
      {...dialog.props}
      {...(isCreateDashboardEnabled ? {} : { footer: null })}
      title="New Dashboard"
      okText="Save"
      cancelText="Close"
      okButtonProps={{
        disabled: !isValid || saveInProgress,
        loading: saveInProgress,
        "data-test": "DashboardSaveButton",
      }}
      cancelButtonProps={{
        disabled: saveInProgress,
      }}
      onOk={save}
      closable={!saveInProgress}
      maskClosable={!saveInProgress}
      wrapProps={{
        "data-test": "CreateDashboardDialog",
      }}>
      <DynamicComponent name="CreateDashboardDialogExtra" disabled={!isCreateDashboardEnabled}>
        <Input
          defaultValue={name}
          onChange={handleNameChange}
          onPressEnter={save}
          placeholder="Dashboard Name"
          aria-label="Dashboard name"
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
