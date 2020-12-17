import React from "react";
import { findKey } from "lodash";
import PropTypes from "prop-types";
import Table from "antd/lib/table";
import { QueryBasedParameterMappingType } from "@/services/parameters/QueryBasedDropdownParameter";
import QueryBasedParameterMappingEditor from "./QueryBasedParameterMappingEditor";

export default function QueryBasedParameterMappingTable({ param, mappingParameters, onChangeParam }) {
  return (
    <Table
      dataSource={mappingParameters}
      size="middle"
      pagination={false}
      rowKey={({ mappingParam }) => `param${mappingParam.name}`}>
      <Table.Column title="Title" key="title" render={({ mappingParam }) => mappingParam.getTitle()} />
      <Table.Column
        title="Keyword"
        key="keyword"
        className="keyword"
        render={({ mappingParam }) => <code>{`{{ ${mappingParam.name} }}`}</code>}
      />
      <Table.Column
        title="Value Source"
        key="source"
        render={({ mappingParam, existingMapping }) => (
          <QueryBasedParameterMappingEditor
            parameter={mappingParam.setValue(existingMapping.staticValue)}
            mapping={existingMapping}
            searchAvailable={
              !findKey(param.parameterMapping, {
                mappingType: QueryBasedParameterMappingType.DROPDOWN_SEARCH,
              }) || existingMapping.mappingType === QueryBasedParameterMappingType.DROPDOWN_SEARCH
            }
            onChange={mapping =>
              onChangeParam({
                ...param,
                parameterMapping: { ...param.parameterMapping, [mappingParam.name]: mapping },
              })
            }
          />
        )}
      />
    </Table>
  );
}

QueryBasedParameterMappingTable.propTypes = {
  param: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  mappingParameters: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
  onChangeParam: PropTypes.func,
};

QueryBasedParameterMappingTable.defaultProps = {
  mappingParameters: [],
  onChangeParam: () => {},
};
