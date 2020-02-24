import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Popover from "antd/lib/popover";

import "./index.less";

export default function InputPopover({
  header,
  content,
  children,
  okButtonProps,
  cancelButtonProps,
  onCancel,
  onOk,
  ...props
}) {
  return (
    <Popover
      {...props}
      content={
        <div className="input-popover-content" data-test="InputPopoverContent">
          {header && <header>{header}</header>}
          {content}
          <footer>
            <Button onClick={onCancel} {...cancelButtonProps}>
              Cancel
            </Button>
            <Button onClick={onOk} type="primary" {...okButtonProps}>
              OK
            </Button>
          </footer>
        </div>
      }>
      {children}
    </Popover>
  );
}

InputPopover.propTypes = {
  header: PropTypes.node,
  content: PropTypes.node,
  children: PropTypes.node,
  okButtonProps: PropTypes.object,
  cancelButtonProps: PropTypes.object,
  onOk: PropTypes.func,
  onCancel: PropTypes.func,
};

InputPopover.defaultProps = {
  header: null,
  children: null,
  okButtonProps: null,
  cancelButtonProps: null,
  onOk: () => {},
  onCancel: () => {},
};
