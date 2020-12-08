import React, { useState } from "react";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'mark... Remove this comment to see the full error message
import { markdown } from "markdown";
import Menu from "antd/lib/menu";
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '@red... Remove this comment to see the full error message
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
import TextboxDialog from "@/components/dashboards/TextboxDialog";
import Widget from "./Widget";

type OwnProps = {
    widget: any;
    canEdit?: boolean;
};

type Props = OwnProps & typeof TextboxWidget.defaultProps;

function TextboxWidget(props: Props) {
  const { widget, canEdit } = props;
  const [text, setText] = useState(widget.text);

  const editTextBox = () => {
    TextboxDialog.showModal({
      text: widget.text,
    }).onClose((newText: any) => {
      widget.text = newText;
      setText(newText);
      return widget.save();
    });
  };

  const TextboxMenuOptions = [
    <Menu.Item key="edit" onClick={editTextBox}>
      Edit
    </Menu.Item>,
  ];

  if (!widget.width) {
    return null;
  }

  return (
    // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
    <Widget {...props} menuOptions={canEdit ? TextboxMenuOptions : null} className="widget-text">
      <HtmlContent className="body-row-auto scrollbox t-body p-15 markdown">{markdown.toHTML(text || "")}</HtmlContent>
    </Widget>
  );
}

TextboxWidget.defaultProps = {
  canEdit: false,
};

export default TextboxWidget;
