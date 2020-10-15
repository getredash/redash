import PropTypes from "prop-types";
import React from "react";
import { registerComponent } from "@/components/DynamicComponent";
import { QuerySourceTypeIcon } from "@/pages/queries/components/QuerySourceTypeIcon";

export function QuerySourceDropdownItem({ dataSource, children }) {
  return (
    <React.Fragment>
      <QuerySourceTypeIcon type={dataSource.type} alt={dataSource.name} />
      {children ? children : <span>{dataSource.name}</span>}
    </React.Fragment>
  );
}

QuerySourceDropdownItem.propTypes = {
  dataSource: PropTypes.shape({
    name: PropTypes.string,
    id: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  children: PropTypes.element,
};

registerComponent("QuerySourceDropdownItem", QuerySourceDropdownItem);
