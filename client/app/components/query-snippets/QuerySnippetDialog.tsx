import { isNil, get } from "lodash";
import React, { useCallback } from "react";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    querySnippet?: any;
    readOnly?: boolean;
};

type Props = OwnProps & typeof QuerySnippetDialog.defaultProps;

function QuerySnippetDialog({ querySnippet, dialog, readOnly }: Props) {
  const handleSubmit = useCallback(
    (values, successCallback, errorCallback) => {
      const querySnippetId = get(querySnippet, "id");

      if (isNil(values.description)) {
        values.description = "";
      }

      dialog
        .close(querySnippetId ? { id: querySnippetId, ...values } : values)
        .then(() => successCallback("Saved."))
        .catch(() => errorCallback("Failed saving snippet."));
    },
    [dialog, querySnippet]
  );

  const isEditing = !!get(querySnippet, "id");

  const formFields = [
    { name: "trigger", title: "Trigger", type: "text", required: true, autoFocus: !isEditing },
    { name: "description", title: "Description", type: "text" },
    { name: "snippet", title: "Snippet", type: "ace", required: true },
  ].map(field => ({ ...field, readOnly, initialValue: get(querySnippet, field.name, "") }));

  return (
    <Modal
      {...dialog.props}
      title={isEditing ? querySnippet.trigger : "Create Query Snippet"}
      footer={[
        <Button key="cancel" {...dialog.props.cancelButtonProps} onClick={dialog.dismiss}>
          {readOnly ? "Close" : "Cancel"}
        </Button>,
        !readOnly && (
          <Button
            key="submit"
            {...dialog.props.okButtonProps}
            disabled={readOnly || dialog.props.okButtonProps.disabled}
            htmlType="submit"
            type="primary"
            form="querySnippetForm"
            data-test="SaveQuerySnippetButton">
            {isEditing ? "Save" : "Create"}
          </Button>
        ),
      ]}
      wrapProps={{
        "data-test": "QuerySnippetDialog",
      }}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
      <DynamicForm id="querySnippetForm" fields={formFields} onSubmit={handleSubmit} hideSubmitButton feedbackIcons />
    </Modal>
  );
}

QuerySnippetDialog.defaultProps = {
  querySnippet: null,
  readOnly: false,
};

export default wrapDialog(QuerySnippetDialog);
