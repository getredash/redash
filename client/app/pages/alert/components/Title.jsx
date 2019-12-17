import React from "react";
import PropTypes from "prop-types";
import Input from "antd/lib/input";
import { getDefaultName } from "../Alert";

import { Alert as AlertType } from "@/components/proptypes";

export default function Title({ alert, editMode, name, onChange, children }) {
  const defaultName = getDefaultName(alert);
  return (
    <div className="p-b-10 m-l-0 m-r-0 page-header--new">
      <div className="d-flex">
        <h3>
          {editMode && alert.query ? (
            <Input
              className="f-inherit"
              placeholder={defaultName}
              value={name}
              onChange={e => onChange(e.target.value)}
            />
          ) : (
            name || defaultName
          )}
        </h3>
        <span className="alert-actions">{children}</span>
      </div>
    </div>
  );
}

Title.propTypes = {
  alert: AlertType.isRequired,
  name: PropTypes.string,
  children: PropTypes.node,
  onChange: PropTypes.func,
  editMode: PropTypes.bool,
};

Title.defaultProps = {
  name: null,
  children: null,
  onChange: null,
  editMode: false,
};
