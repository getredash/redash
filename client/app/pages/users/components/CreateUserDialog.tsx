import React, { useState, useEffect, useCallback } from "react";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import Alert from "antd/lib/alert";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import recordEvent from "@/services/recordEvent";

const formFields = [
  { required: true, name: "name", title: "Name", type: "text", autoFocus: true },
  { required: true, name: "email", title: "Email", type: "email" },
];

type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
};

function CreateUserDialog({ dialog }: Props) {
  const [error, setError] = useState(null);
  useEffect(() => {
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
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
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
      <DynamicForm id="userForm" fields={formFields} onSubmit={handleSubmit} hideSubmitButton />
      {/* @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'. */}
      {error && <Alert message={error.message} type="error" showIcon data-test="CreateUserErrorAlert" />}
    </Modal>
  );
}

export default wrapDialog(CreateUserDialog);
