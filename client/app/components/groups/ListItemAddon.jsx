import React from 'react';
import PropTypes from 'prop-types';
import Tooltip from 'antd/lib/tooltip';

export default function ListItemAddon({ isSelected, isStaged, alreadyInGroup }) {
  if (isStaged) {
    return <i className="fa fa-remove" />;
  }
  if (alreadyInGroup) {
    return <Tooltip title="Already in this group"><i className="fa fa-check" /></Tooltip>;
  }
  return isSelected ? <i className="fa fa-check" /> : <i className="fa fa-angle-double-right" />;
}

ListItemAddon.propTypes = {
  isSelected: PropTypes.bool,
  isStaged: PropTypes.bool,
  alreadyInGroup: PropTypes.bool,
};

ListItemAddon.defaultProps = {
  isSelected: false,
  isStaged: false,
  alreadyInGroup: false,
};
