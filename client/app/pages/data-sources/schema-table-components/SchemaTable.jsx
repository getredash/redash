import React from 'react';
import { react2angular } from 'react2angular';
import PropTypes from 'prop-types';
import Table from 'antd/lib/table';
import Popconfirm from 'antd/lib/popconfirm';
import { Schema } from '@/components/proptypes';
import { EditableCell, EditableFormRow, EditableContext } from './EditableTable';
import TableVisibilityCheckbox from './TableVisibilityCheckbox';

import './schema-table.css';

function fetchTableData(schema) {
  return schema.map(tableData => ({
    key: tableData.id,
    name: tableData.name,
    table_description: tableData.table_description || '',
    table_visible: tableData.visible,
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

class SchemaTable extends React.Component {
  static propTypes = {
    schema: Schema, // eslint-disable-line react/no-unused-prop-types
    updateSchema: PropTypes.func.isRequired,
  };

  static defaultProps = {
    schema: null,
  };

  constructor(props) {
    super(props);
    this.state = { data: [], editingKey: '' };
    this.columns = [{
      title: 'Table Name',
      dataIndex: 'name',
      width: '19%',
      key: 'name',
    }, {
      title: 'Table Description',
      dataIndex: 'table_description',
      width: '31%',
      key: 'table_description',
      editable: true,
      render: this.truncateDescriptionText,
    }, {
      title: 'Sample Queries',
      dataIndex: 'sample_queries',
      width: '25%',
      key: 'sample_queries',
      editable: true,
      render: text => (
        <ul style={{ margin: 0, paddingLeft: '15px' }}>
          {Object.values(text).map(query => (
            <li key={query.id}><a target="_blank" rel="noopener noreferrer" href={`queries/${query.id}/source`}>{query.name}</a></li>
          ))}
        </ul>
      ),
    }, {
      title: 'Visibility',
      dataIndex: 'table_visible',
      width: '10%',
      key: 'table_visible',
      editable: true,
      render: (text, record) => (
        <div>
          <TableVisibilityCheckbox
            disabled
            visible={record.table_visible}
          />
        </div>
      ),
    }, {
      title: '',
      width: '15%',
      dataIndex: 'edit',
      key: 'edit',
      // Purposely calling fieldEditor() instead of setting render() to it
      // because render() will pass a different third argument than what
      // fieldEditory() takes
      render: (text, record) => this.fieldEditor(text, record),
    }];
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

  truncateDescriptionText = (text) => {
    if (!text) {
      return;
    }
    const MAX_CHARACTER_COUNT = 305;
    const addEllipses = text.length > MAX_CHARACTER_COUNT;

    return (
      <div title={text}>
        {`${text.replace(/\n/g, ' ').substring(0, MAX_CHARACTER_COUNT)}${addEllipses ? '...' : ''}`}
      </div>
    );
  }

  fieldEditor(text, record, tableData) {
    const editable = this.isEditing(record);
    const tableKey = tableData ? tableData.key : record.key;
    const columnKey = tableData ? record.key : undefined;
    return (
      <div>
        {editable ? (
          <span>
            <EditableContext.Consumer>
              {form => (
                <button
                  className="btn btn-default"
                  onClick={() => this.save(form, tableKey, columnKey)}
                  style={{ marginRight: 8 }}
                >
                  Save
                </button>
              )}
            </EditableContext.Consumer>
            <Popconfirm
              title="Sure to cancel?"
              onConfirm={() => this.cancel(record.key)}
            >
              <button className="btn btn-default">Cancel</button>
            </Popconfirm>
          </span>
        ) : (
          <button
            className="btn btn-default"
            onClick={() => this.edit(record.key)}
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  expandedRowRender = (tableData) => {
    const columns = [
      {
        title: 'Column Name',
        dataIndex: 'name',
        key: 'name',
        width: '15%',
      }, {
        title: 'Column Type',
        dataIndex: 'type',
        key: 'type',
        width: '15%',
      }, {
        title: 'Column Example',
        dataIndex: 'example',
        key: 'example',
        width: '20%',
      }, {
        title: 'Column Description',
        dataIndex: 'column_description',
        key: 'column_description',
        width: '35%',
        editable: true,
        render: this.truncateDescriptionText,
        onCell: record => ({
          record,
          input_type: 'text',
          dataIndex: 'column_description',
          title: 'Column Description',
          editing: this.isEditing(record),
        }),
      },
      {
        title: '',
        width: '15%',
        dataIndex: 'edit',
        key: 'edit',
        render: (text, record) => this.fieldEditor(text, record, tableData),
      },
    ];

    return (
      <Table
        components={components}
        columns={columns}
        dataSource={tableData.columns}
        rowClassName="editable-row"
        pagination={false}
      />
    );
  }

  cancel() {
    this.setState({ editingKey: '' });
  }

  edit(key) {
    this.setState({ editingKey: key });
  }

  isEditing(record) {
    return record.key === this.state.editingKey;
  }

  save(form, tableKey, columnKey) {
    form.validateFields((error, editedFields) => {
      if (error) {
        return;
      }
      const newData = [...this.state.data];
      let spliceIndex = newData.findIndex(item => tableKey === item.key);

      if (spliceIndex < 0) {
        return;
      }

      const tableRow = newData[spliceIndex];
      let dataToUpdate = newData;
      let rowToUpdate = tableRow;

      const columnIndex = tableRow.columns.findIndex(item => columnKey === item.key);
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
      this.props.updateSchema(editedFields, tableRow.key, columnRow ? columnRow.key : undefined);
      this.setState({ data: newData, editingKey: '' });
    });
  }

  render() {
    const columns = this.columns.map(col => ({
      ...col,
      onCell: record => ({
        // eslint-disable-next-line react/prop-types
        query: this.props.Query || function query() {},
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
        rowClassName="editable-row"
        expandedRowRender={this.expandedRowRender}
      />
    );
  }
}

export default function init(ngModule) {
  ngModule.component('schemaTable', react2angular(SchemaTable, null, ['Query']));
}

init.init = true;
