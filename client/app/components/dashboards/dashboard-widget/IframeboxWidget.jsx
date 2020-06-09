import React, { useState } from "react";
import PropTypes from "prop-types";
import Menu from "antd/lib/menu";
import IframeboxDialog, { toIframe } from '@/components/dashboards/IframeboxDialog';
import Widget from "./Widget";

function IframeboxWidget(props) {
  const { widget, canEdit } = props;
  const [text, setText] = useState(widget.text);

  const editIframeBox = () => {
    IframeboxDialog.showModal({
      text: widget.text,
    }).onClose(newText => {
      widget.text = newText;
      widget.options = {
        ...widget.options,
        isIframe: true,
      };
      setText(newText);
      return widget.save();
    });
  };

  const IframeboxMenuOptions = [
    <Menu.Item key="edit" onClick={editIframeBox}>
      Edit
    </Menu.Item>,
  ];

  if (!widget.width) {
    return null;
  }

  return (
    <Widget {...props} menuOptions={canEdit ? IframeboxMenuOptions : null} className="widget-text">
      <div
        className="body-row-auto scrollbox t-body p-15 markdown"
        dangerouslySetInnerHTML={{ __html: toIframe(text || "") }} // eslint-disable-line react/no-danger
      />
    </Widget>
  );
}

IframeboxWidget.propTypes = {
  widget: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  canEdit: PropTypes.bool,
};

IframeboxWidget.defaultProps = {
  canEdit: false,
};

export default IframeboxWidget;
