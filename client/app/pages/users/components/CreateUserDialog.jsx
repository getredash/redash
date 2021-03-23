import React, { useState, useEffect, useCallback } from "react";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import Alert from "antd/lib/alert";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import recordEvent from "@/services/recordEvent";

const formFields = [
  { required: true, name: "name", title: "Name", type: "text", autoFocus: true },
  { required: true, name: "email", title: "Email", type: "email" },
];

function CreateUserDialog({ dialog }) {
  const [error, setError] = useState(null);
  useEffect(() => {
    recordEvent("view", "page", "users/new");
  }, []);

  const handleSubmit = useCallback(values => dialog.close(values).catch(setError), [dialog]);

  return (
    <Modal
      {...dialog.props}
      title="Create a New User"
      footer={[
        <Button key="cancel" {...dialog.props.cancelButtonProps} onClick={dialog.dismiss}>
          Cancel
        </Button>,
        <Button
          key="submit"
          {...dialog.props.okButtonProps}
          htmlType="submit"
          type="primary"
          form="userForm"
          data-test="SaveUserButton">
          Create
        </Button>,
      ]}
      wrapProps={{
        "data-test": "CreateUserDialog",
      }}>
      <DynamicForm id="userForm" fields={formFields} onSubmit={handleSubmit} hideSubmitButton />
      {error && <Alert message={error.message} type="error" showIcon data-test="CreateUserErrorAlert" />}
    </Modal>
  );
}

CreateUserDialog.propTypes = {
  dialog: DialogPropType.isRequired,
};

export default wrapDialog(CreateUserDialog);
