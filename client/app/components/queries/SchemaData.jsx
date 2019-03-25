import { some } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Drawer from "antd/lib/drawer";
import Table from "antd/lib/table";

import { DataSourceMetadata, Query } from "@/components/proptypes";

function textWrapRenderer(text) {
  return <div style={{ wordWrap: "break-word", wordBreak: "break-all" }}>{text}</div>;
}

export default class SchemaData extends React.PureComponent {
  static propTypes = {
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    tableName: PropTypes.string,
    tableDescription: PropTypes.string,
    tableMetadata: PropTypes.arrayOf(DataSourceMetadata),
    sampleQueries: PropTypes.arrayOf(Query),
  };

  static defaultProps = {
    tableName: "",
    tableDescription: "",
    tableMetadata: [],
    sampleQueries: [],
  };

  render() {
    const tableDataColumns = [
      {
        title: "Metadata",
        dataIndex: "metadata",
        width: 400,
        key: "metadata",
      },
      {
        title: "Value",
        dataIndex: "value",
        width: 400,
        key: "value",
        render: text => {
          if (typeof text === "string") {
            return text;
          }
          return (
            <ul style={{ margin: 0, paddingLeft: "15px" }}>
              {Object.values(text).map(query => (
                <li>
                  <a target="_blank" rel="noopener noreferrer" href={`queries/${query.id}/source`}>
                    {query.name}
                  </a>
                </li>
              ))}
            </ul>
          );
        },
      },
    ];

    const columnDataColumns = [
      {
        title: "Column Name",
        dataIndex: "name",
        width: 400,
        key: "name",
        render: textWrapRenderer,
      },
      {
        title: "Column Type",
        dataIndex: "type",
        width: 400,
        key: "type",
        render: textWrapRenderer,
      },
    ];

    const hasDescription = some(this.props.tableMetadata, columnMetadata => columnMetadata.description);

    const hasExample = some(this.props.tableMetadata, columnMetadata => columnMetadata.example);

    if (hasDescription) {
      columnDataColumns.push({
        title: "Description",
        dataIndex: "description",
        width: 400,
        key: "description",
        render: textWrapRenderer,
      });
    }

    if (hasExample) {
      columnDataColumns.push({
        title: "Example",
        dataIndex: "example",
        width: 400,
        key: "example",
        render: textWrapRenderer,
      });
    }
    const tableData = [
      {
        metadata: "Table Description",
        value: this.props.tableDescription || "N/A",
        key: "description",
      },
      {
        metadata: "Sample Usage",
        value: this.props.sampleQueries.length > 0 ? this.props.sampleQueries : "N/A",
        key: "sample",
      },
    ];

    return (
      <Drawer closable={false} placement="bottom" height={500} onClose={this.props.onClose} visible={this.props.show}>
        <h4 style={{ margin: 0 }}>{this.props.tableName}</h4>
        <hr />
        <h5>Table Data</h5>
        <Table
          dataSource={tableData}
          pagination={false}
          scroll={{ y: 350 }}
          size="small"
          showHeader={false}
          columns={tableDataColumns}
        />
        <br />
        <h5>Column Data</h5>
        <Table
          dataSource={this.props.tableMetadata}
          pagination={false}
          scroll={{ y: 175 }}
          size="small"
          rowKey="id"
          columns={columnDataColumns}
        />
      </Drawer>
    );
  }
}
