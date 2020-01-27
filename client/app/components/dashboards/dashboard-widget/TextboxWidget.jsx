import React, { useState } from "react";
import PropTypes from "prop-types";
import { markdown } from "markdown";
import Menu from "antd/lib/menu";
import HtmlContent from "@/components/HtmlContent";
import TextboxDialog from "@/components/dashboards/TextboxDialog";
import Widget from "./Widget";

function TextboxWidget(props) {
  const { widget, canEdit } = props;
  const [text, setText] = useState(widget.text);

  const editTextBox = () => {
    TextboxDialog.showModal({
      text: widget.text,
      onConfirm: newText => {
        widget.text = newText;
        setText(newText);
        return widget.save();
      },
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
    <Widget {...props} menuOptions={canEdit ? TextboxMenuOptions : null} className="widget-text">
      <HtmlContent className="body-row-auto scrollbox t-body p-15 markdown">{markdown.toHTML(text || "")}</HtmlContent>
    </Widget>
  );
}

TextboxWidget.propTypes = {
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool,
};

TextboxWidget.defaultProps = {
  canEdit: false,
};

export default TextboxWidget;
