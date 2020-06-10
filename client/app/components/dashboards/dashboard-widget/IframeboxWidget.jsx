import React, { useState } from "react";
import PropTypes from "prop-types";
import Menu from "antd/lib/menu";
import IframeboxDialog, { toIframe } from '@/components/dashboards/IframeboxDialog';
import Widget from "./Widget";

function IframeboxWidget(props) {
  const { widget, canEdit } = props;
  const [text, setText] = useState(widget.text);
  const [title, setTitle] = useState(widget.options.title);

  const editIframeBox = () => {
    IframeboxDialog.showModal({
      text: widget.text,
      title: widget.options.title,
    }).onClose((o) => {
      widget.text = o.text;
      widget.options = {
        ...widget.options,
        title: o.title,
        isIframe: true,
      };
      setText(o.text);
      setTitle(o.title);
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
    <Widget
      {...props}
      menuOptions={canEdit ? IframeboxMenuOptions : null}
      className="widget-text"
      header={
        <div className="t-header widget clearfix">
          <div className="th-title">
            {title}
          </div>
        </div>
      }
    >
      <div
        className="body-row-auto t-body p-15"
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
