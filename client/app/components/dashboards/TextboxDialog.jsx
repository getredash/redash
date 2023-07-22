import { toString } from "lodash";
import { markdown } from "markdown";
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useDebouncedCallback } from "use-debounce";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Tooltip from "@/components/Tooltip";
import Divider from "antd/lib/divider";
import Link from "@/components/Link";
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import notification from "@/services/notification";

import "./TextboxDialog.less";

function TextboxDialog({ dialog, isNew, ...props }) {
  const [text, setText] = useState(toString(props.text));
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    setText(props.text);
    setPreview(markdown.toHTML(props.text));
  }, [props.text]);

  const [updatePreview] = useDebouncedCallback(() => {
    setPreview(markdown.toHTML(text));
  }, 200);

  const handleInputChange = useCallback(
    event => {
      setText(event.target.value);
      updatePreview();
    },
    [updatePreview]
  );

  const saveWidget = useCallback(() => {
    dialog.close(text).catch(() => {
      notification.error(isNew ? "Widget could not be added" : "Widget could not be saved");
    });
  }, [dialog, isNew, text]);

  const confirmDialogDismiss = useCallback(() => {
    const originalText = props.text;
    if (text !== originalText) {
      Modal.confirm({
        title: "Quit editing?",
        content: "Changes you made so far will not be saved. Are you sure?",
        okText: "Yes, quit",
        okType: "danger",
        onOk: () => dialog.dismiss(),
        maskClosable: true,
        autoFocusButton: null,
        style: { top: 170 },
      });
    } else {
      dialog.dismiss();
    }
  }, [dialog, text, props.text]);

  return (
    <Modal
      {...dialog.props}
      title={isNew ? "Add Textbox" : "Edit Textbox"}
      onOk={saveWidget}
      onCancel={confirmDialogDismiss}
      okText={isNew ? "Add to Dashboard" : "Save"}
      width={500}
      wrapProps={{ "data-test": "TextboxDialog" }}>
      <div className="textbox-dialog">
        <Input.TextArea
          className="resize-vertical"
          rows="5"
          value={text}
          aria-label="Textbox widget content"
          onChange={handleInputChange}
          autoFocus
          placeholder="This is where you write some text"
        />
        <small>
          Supports basic{" "}
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.markdownguide.org/cheat-sheet/#basic-syntax">
            <Tooltip title="Markdown guide opens in new window">Markdown</Tooltip>
          </Link>
          .
        </small>
        {text && (
          <React.Fragment>
            <Divider dashed />
            <strong className="preview-title">Preview:</strong>
            <HtmlContent className="preview markdown">{preview}</HtmlContent>
          </React.Fragment>
        )}
      </div>
    </Modal>
  );
}

TextboxDialog.propTypes = {
  dialog: DialogPropType.isRequired,
  isNew: PropTypes.bool,
  text: PropTypes.string,
};

TextboxDialog.defaultProps = {
  isNew: false,
  text: "",
};

export default wrapDialog(TextboxDialog);
