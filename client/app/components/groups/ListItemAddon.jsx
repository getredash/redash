import React from "react";
import PropTypes from "prop-types";
import Tooltip from "antd/lib/tooltip";

export default function ListItemAddon({ isSelected, isStaged, alreadyInGroup, deselectedIcon }) {
  if (isStaged) {
    return <i className="fa fa-remove" />;
  }
  if (alreadyInGroup) {
    return (
      <Tooltip title="Already selected">
        <i className="fa fa-check" />
      </Tooltip>
    );
  }
  return isSelected ? <i className="fa fa-check" /> : <i className={`fa ${deselectedIcon}`} />;
}

ListItemAddon.propTypes = {
  isSelected: PropTypes.bool,
  isStaged: PropTypes.bool,
  alreadyInGroup: PropTypes.bool,
  deselectedIcon: PropTypes.string,
};

ListItemAddon.defaultProps = {
  isSelected: false,
  isStaged: false,
  alreadyInGroup: false,
  deselectedIcon: "fa-angle-double-right",
};
