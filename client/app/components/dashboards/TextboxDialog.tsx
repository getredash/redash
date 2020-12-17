import { toString } from "lodash";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'mark... Remove this comment to see the full error message
import { markdown } from "markdown";
import React, { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import Tooltip from "antd/lib/tooltip";
import Divider from "antd/lib/divider";
import Link from "@/components/Link";
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import notification from "@/services/notification";

import "./TextboxDialog.less";

type OwnProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    isNew?: boolean;
    text?: string;
};

type Props = OwnProps & typeof TextboxDialog.defaultProps;

function TextboxDialog({ dialog, isNew, ...props }: Props) {
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
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
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
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'number | ... Remove this comment to see the full error message
          rows="5"
          value={text}
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
            {/* @ts-expect-error ts-migrate(2747) FIXME: 'Tooltip' components don't accept text as child el... Remove this comment to see the full error message */}
            <Tooltip title="Markdown guide opens in new window">Markdown</Tooltip>
          </Link>
          .
        </small>
        {text && (
          <React.Fragment>
            <Divider dashed />
            <strong className="preview-title">Preview:</strong>
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: null; className: string; }' is n... Remove this comment to see the full error message */}
            <HtmlContent className="preview markdown">{preview}</HtmlContent>
          </React.Fragment>
        )}
      </div>
    </Modal>
  );
}

TextboxDialog.defaultProps = {
  isNew: false,
  text: "",
};

export default wrapDialog(TextboxDialog);
