import navigateTo from "@/components/ApplicationArea/navigateTo";
import { DialogPropType, wrap as wrapDialog } from "@/components/DialogWrapper";
import DynamicComponent from "@/components/DynamicComponent";
import { Dashboard } from "@/services/dashboard";
import { policy } from "@/services/policy";
import recordEvent from "@/services/recordEvent";
import Checkbox from "antd/lib/checkbox";
import Input from "antd/lib/input";
import Modal from "antd/lib/modal";
import { trim } from "lodash";
import React, { useState } from "react";

function CreateDashboardDialog({ dialog }) {
  const [name, setName] = useState("");
  const [aiGenerated, setAiGenerated] = useState(false);
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

      Dashboard.save({ name, ai_generated: aiGenerated }).then((data) => {
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
      }}
    >
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
        <Checkbox
          checked={aiGenerated}
          onChange={(e) => setAiGenerated(e.target.checked)}
          disabled={saveInProgress}
          className="m-t-20"
        >
          Generate using AI
        </Checkbox>
      </DynamicComponent>
    </Modal>
  );
}

CreateDashboardDialog.propTypes = {
  dialog: DialogPropType.isRequired,
};

export default wrapDialog(CreateDashboardDialog);
