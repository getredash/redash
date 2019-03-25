import React from "react";
import PropTypes from "prop-types";
import Table from "antd/lib/table";
import Popconfirm from "antd/lib/popconfirm";
import { Schema } from "@/components/proptypes";
import { EditableCell, EditableFormRow, EditableContext } from "./EditableTable";
import TableVisibilityCheckbox from "./TableVisibilityCheckbox";

import "./schema-table.css";

function fetchTableData(schema) {
  return schema.map(tableData => ({
    id: tableData.id,
    name: tableData.name,
    description: tableData.description || "",
    visible: tableData.visible,
    columns: tableData.columns,
    sample_queries: tableData.sample_queries || {},
  }));
}

const components = {
  body: {
    row: EditableFormRow,
    cell: EditableCell,
  },
};

export default class SchemaTable extends React.Component {
  static propTypes = {
    schema: Schema, // eslint-disable-line react/no-unused-prop-types
    updateSchema: PropTypes.func.isRequired,
  };

  static defaultProps = {
    schema: null,
  };

  constructor(props) {
    super(props);
    this.state = { data: [], editingKey: "" };
    this.columns = [
      {
        title: "Table Name",
        dataIndex: "name",
        width: "18%",
        key: "name",
      },
      {
        title: "Table Description",
        dataIndex: "description",
        width: "36%",
        key: "description",
        editable: true,
        render: this.truncateDescriptionText,
      },
      {
        title: "Sample Queries",
        dataIndex: "sample_queries",
        width: "24%",
        key: "sample_queries",
        editable: true,
        render: text => (
          <ul style={{ margin: 0, paddingLeft: "15px" }}>
            {Object.values(text).map(query => (
              <li key={query.id}>
                <a target="_blank" rel="noopener noreferrer" href={`queries/${query.id}/source`}>
                  {query.name}
                </a>
              </li>
            ))}
          </ul>
        ),
      },
      {
        title: "Visibility",
        dataIndex: "visible",
        width: "10%",
        key: "visible",
        editable: true,
        render: (text, record) => (
          <div>
            <TableVisibilityCheckbox disabled visible={record.visible} />
          </div>
        ),
      },
      {
        title: "",
        width: "12%",
        dataIndex: "edit",
        key: "edit",
        // Purposely calling fieldEditor() instead of setting render() to it
        // because render() will pass a different third argument than what
        // fieldEditory() takes
        render: (text, record) => this.fieldEditor(text, record),
      },
    ];
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.schema && prevState.data.length === 0) {
      return {
        data: fetchTableData(nextProps.schema),
        editingKey: prevState.editingKey,
      };
    }
    return prevState;
  }

  expandedRowRender = tableData => {
    const columns = [
      {
        title: "Column Name",
        dataIndex: "name",
        key: "name",
        width: "15%",
      },
      {
        title: "Column Type",
        dataIndex: "type",
        key: "type",
        width: "15%",
      },
      {
        title: "Column Example",
        dataIndex: "example",
        key: "example",
        width: "20%",
      },
      {
        title: "Column Description",
        dataIndex: "description",
        key: "description",
        width: "35%",
        editable: true,
        render: this.truncateDescriptionText,
        onCell: record => ({
          record,
          input_type: "text",
          dataIndex: "description",
          title: "Column Description",
          editing: this.isEditing(record),
        }),
      },
      {
        title: "",
        width: "15%",
        dataIndex: "edit",
        key: "edit",
        render: (text, record) => this.fieldEditor(text, record, tableData),
      },
    ];

    return (
      <Table
        components={components}
        columns={columns}
        rowKey="id"
        dataSource={tableData.columns}
        rowClassName="editable-row"
        pagination={false}
      />
    );
  };

  truncateDescriptionText = text => {
    if (!text) {
      return;
    }
    const MAX_CHARACTER_COUNT = 305;
    const addEllipses = text.length > MAX_CHARACTER_COUNT;
    return (
      <div title={text}>
        {`${text.replace(/\n/g, " ").substring(0, MAX_CHARACTER_COUNT)}${addEllipses ? "..." : ""}`}
      </div>
    );
  };

  fieldEditor(text, record, tableData) {
    const editable = this.isEditing(record);
    const tableKey = tableData ? tableData.id : record.id;
    const columnKey = tableData ? record.id : undefined;
    return (
      <div>
        {editable ? (
          <span>
            <EditableContext.Consumer>
              {form => (
                <a onClick={() => this.save(form, tableKey, columnKey)} style={{ marginRight: 8 }}>
                  Save
                </a>
              )}
            </EditableContext.Consumer>
            <Popconfirm title="Sure to cancel?" onConfirm={() => this.cancel(record.id)}>
              <a>Cancel</a>
            </Popconfirm>
          </span>
        ) : (
          <a onClick={() => this.edit(record.id)}>Edit</a>
        )}
      </div>
    );
  }

  cancel() {
    this.setState({ editingKey: "" });
  }

  edit(key) {
    this.setState({ editingKey: key });
  }

  isEditing(record) {
    return record.id === this.state.editingKey;
  }

  save(form, tableKey, columnKey) {
    form.validateFields((error, editedFields) => {
      if (error) {
        return;
      }
      const newData = [...this.state.data];
      let spliceIndex = newData.findIndex(item => tableKey === item.id);

      if (spliceIndex < 0) {
        return;
      }

      const tableRow = newData[spliceIndex];
      let dataToUpdate = newData;
      let rowToUpdate = tableRow;

      const columnIndex = tableRow.columns.findIndex(item => columnKey === item.id);
      const columnRow = tableRow.columns[columnIndex];
      if (columnKey) {
        dataToUpdate = tableRow.columns;
        spliceIndex = columnIndex;
        rowToUpdate = columnRow;
      }

      dataToUpdate.splice(spliceIndex, 1, {
        ...rowToUpdate,
        ...editedFields,
      });
      this.props.updateSchema(editedFields, tableRow.id, columnRow ? columnRow.id : undefined);
      this.setState({ data: newData, editingKey: "" });
    });
  }

  render() {
    const columns = this.columns.map(col => ({
      ...col,
      onCell: record => ({
        record,
        input_type: col.dataIndex,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: col.editable ? this.isEditing(record) : false,
      }),
    }));

    return (
      <Table
        components={components}
        bordered
        side="middle"
        dataSource={this.state.data}
        pagination={false}
        columns={columns}
        rowKey={row => row.id}
        rowClassName="editable-row"
        expandedRowRender={this.expandedRowRender}
      />
    );
  }
}
