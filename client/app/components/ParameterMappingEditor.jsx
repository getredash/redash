import React from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";

import "./ParameterMappingEditor.less";

export default function ParameterMappingEditor({ header, children, saveDisabled, onCancel, onSave }) {
  return (
    <div className="parameter-mapping-editor" data-test="EditParamMappingPopover">
      {header && <header>{header}</header>}
      {children}
      <footer>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} disabled={saveDisabled} type="primary">
          OK
        </Button>
      </footer>
    </div>
  );
}

ParameterMappingEditor.propTypes = {
  header: PropTypes.node,
  children: PropTypes.node,
  saveDisabled: PropTypes.bool,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};

ParameterMappingEditor.defaultProps = {
  header: null,
  children: null,
  saveDisabled: false,
  onSave: () => {},
  onCancel: () => {},
};
