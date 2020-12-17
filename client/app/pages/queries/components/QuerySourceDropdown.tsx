import Select from "antd/lib/select";
import { map } from "lodash";
import DynamicComponent, { registerComponent } from "@/components/DynamicComponent";
import React from "react";

import "./QuerySourceDropdownItem";

type Props = {
    dataSources?: any;
    value?: string | number;
    disabled?: boolean;
    loading?: boolean;
    onChange?: (...args: any[]) => any;
}; // register QuerySourceDropdownItem

export function QuerySourceDropdown(props: Props) {
  return (
    <Select
      className="w-100"
      data-test="SelectDataSource"
      placeholder="Choose data source..."
      value={props.value}
      disabled={props.disabled}
      loading={props.loading}
      optionFilterProp="data-name"
      showSearch
      onChange={props.onChange}>
      {map(props.dataSources, ds => (
        <Select.Option key={`ds-${ds.id}`} value={ds.id} data-name={ds.name} data-test={`SelectDataSource${ds.id}`}>
          {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
          <DynamicComponent name={"QuerySourceDropdownItem"} dataSource={ds} />
        </Select.Option>
      ))}
    </Select>
  );
}

registerComponent("QuerySourceDropdown", QuerySourceDropdown);
