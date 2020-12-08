import React from "react";
import Tooltip from "antd/lib/tooltip";

type OwnProps = {
    isSelected?: boolean;
    isStaged?: boolean;
    alreadyInGroup?: boolean;
    deselectedIcon?: string;
};

type Props = OwnProps & typeof ListItemAddon.defaultProps;

export default function ListItemAddon({ isSelected, isStaged, alreadyInGroup, deselectedIcon }: Props) {
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

ListItemAddon.defaultProps = {
  isSelected: false,
  isStaged: false,
  alreadyInGroup: false,
  deselectedIcon: "fa-angle-double-right",
};
