
import React from "react";
import { registerComponent } from "@/components/DynamicComponent";
import { QuerySourceTypeIcon } from "@/pages/queries/components/QuerySourceTypeIcon";

type Props = {
    dataSource: {
        name?: string;
        id?: string | number;
        type?: string;
    };
    children?: React.ReactElement;
};

export function QuerySourceDropdownItem({ dataSource, children }: Props) {
  return (
    <React.Fragment>
      <QuerySourceTypeIcon type={dataSource.type} alt={dataSource.name} />
      {children ? children : <span>{dataSource.name}</span>}
    </React.Fragment>
  );
}

registerComponent("QuerySourceDropdownItem", QuerySourceDropdownItem);
