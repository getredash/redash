import React, { useState } from "react";
import PropTypes from "prop-types";
import markdownToHtml from "@/lib/markdown";
import Menu from "antd/lib/menu";
import HtmlContent from "@redash/viz/lib/components/HtmlContent";
import TextboxDialog from "@/components/dashboards/TextboxDialog";
import Widget from "./Widget";

function TextboxWidget(props) {
  const { widget, canEdit } = props;
  const [text, setText] = useState(widget.text);

  const editTextBox = () => {
    TextboxDialog.showModal({
      text: widget.text,
    }).onClose((newText) => {
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
    <Widget {...props} menuOptions={canEdit ? TextboxMenuOptions : null} className="widget-text">
      <HtmlContent className="body-row-auto scrollbox t-body p-15 markdown">{markdownToHtml(text)}</HtmlContent>
    </Widget>
  );
}

TextboxWidget.propTypes = {
  widget: PropTypes.object.isRequired,
  canEdit: PropTypes.bool,
};

TextboxWidget.defaultProps = {
  canEdit: false,
};

export default TextboxWidget;
