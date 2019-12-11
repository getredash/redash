import React from "react";
import PropTypes from "prop-types";
import { get } from "lodash";
import Button from "antd/lib/button";
import Modal from "antd/lib/modal";
import DynamicForm from "@/components/dynamic-form/DynamicForm";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";

class QuerySnippetDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    querySnippet: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    readOnly: PropTypes.bool,
    onSubmit: PropTypes.func.isRequired,
  };

  static defaultProps = {
    querySnippet: null,
    readOnly: false,
  };

  constructor(props) {
    super(props);
    this.state = { saving: false };
  }

  handleSubmit = (values, successCallback, errorCallback) => {
    const { querySnippet, dialog, onSubmit } = this.props;
    const querySnippetId = get(querySnippet, "id");

    this.setState({ saving: true });
    onSubmit(querySnippetId ? { id: querySnippetId, ...values } : values)
      .then(() => {
        dialog.close();
        successCallback("Saved.");
      })
      .catch(() => {
        this.setState({ saving: false });
        errorCallback("Failed saving snippet.");
      });
  };

  render() {
    const { saving } = this.state;
    const { querySnippet, dialog, readOnly } = this.props;
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
          <Button key="cancel" onClick={dialog.dismiss}>
            {readOnly ? "Close" : "Cancel"}
          </Button>,
          !readOnly && (
            <Button
              key="submit"
              htmlType="submit"
              loading={saving}
              disabled={readOnly}
              type="primary"
              form="querySnippetForm">
              {isEditing ? "Save" : "Create"}
            </Button>
          ),
        ]}>
        <DynamicForm
          id="querySnippetForm"
          fields={formFields}
          onSubmit={this.handleSubmit}
          hideSubmitButton
          feedbackIcons
        />
      </Modal>
    );
  }
}

export default wrapDialog(QuerySnippetDialog);
