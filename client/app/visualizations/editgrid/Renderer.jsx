import React, { useState, useContext, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { RendererPropTypes } from "@/visualizations";
import { forIn, isEqual, includes } from "lodash";
import { Query, isDynamicDate, getDynamicDate } from "@/services/query";
import notification from "@/services/notification";
import ParameterValueInput from "@/components/ParameterValueInput";
import {
  Table,
  Input,
  InputNumber,
  Checkbox,
  Select,
  Button,
  Popconfirm,
  Form,
} from "antd";
import * as Grid from "antd/lib/grid";

import initTextColumn from "./columns/text";
import initNumberColumn from "./columns/number";
import initDateTimeColumn from "./columns/datetime";
import initBooleanColumn from "./columns/boolean";
import initLinkColumn from "./columns/link";
import initImageColumn from "./columns/image";
import initJsonColumn from "./columns/json";

const ColumnTypes = {
  enum: initTextColumn,
  query: initTextColumn,
  string: initTextColumn,
  number: initNumberColumn,
  datetime: initDateTimeColumn,
  boolean: initBooleanColumn,
  link: initLinkColumn,
  image: initImageColumn,
  json: initJsonColumn,
};

const commands = {
  add:
    "insert into {{table}} ({{currentColumns}}) values ({{currentRowValues}});",
  delete: "delete from {{table}} where {{primaryKey}} = {{currentKey}};",
  update:
    "update {{table}} set {{endtime}}='{{currentTime}}' where {{primaryKey}} = {{currentKey}} and {{endtime}} is null;",
};

function getCurrentTime() {
  return getDynamicDate("d_now").value();
}

function getCurrentTimeString(value) {
  const dateFormatting = initDateTimeColumn({
    name: "a",
    dateTimeFormat: "YYYY-MM-DDTHH:mm:ss.sss",
  });
  if (value) {
    return dateFormatting({ row: { a: value } });
  }
  return dateFormatting({ row: { a: getCurrentTime() } });
}

function getDefaultColumnsOptions(columns, isEditing) {
  function comparator(a, b, type) {
    // Null Handling first
    if (a !== null && b !== null) {
      if (type === "number") {
        return a - b;
      }
      if (type === "datetime") {
        const timeDiff = a.diff(b, "seconds");
        if (timeDiff > 0) {
          return 1;
        }
        if (timeDiff < 0) {
          return -1;
        }
        return 0;
      }
      if (type === "boolean") {
        if (!a && b) {
          return 1;
        }
        if (a && !b) {
          return -1;
        }
        return 0;
      }
      if (a.toLowerCase() > b.toLowerCase()) {
        return 1;
      }
      if (b.toLowerCase() > a.toLowerCase()) {
        return -1;
      }
      return 0;
    }
    if (a !== null) {
      return -1;
    }
    if (b !== null) {
      return 1;
    }
  }

  const editColumns = Object.values(columns).map((col) => {
    const initColumn = ColumnTypes[col.format];
    const renderCol = {
      name: col.name,
      type: col.type,
      dateTimeFormat: col.dateFormat ? col.dateFormat : "YYYY-MM-DD",
    };
    const Component = initColumn(renderCol);

    const result = {
      ...col,
      sorter: (a, b) =>
        comparator(a[col.dataIndex], b[col.dataIndex], col.format),
      render: (value, row) => ({
        children: <Component row={row} />,
        props: { className: `display-as-${col.format}` },
      }),
      onCell: (record) => ({
        record,
        inputType: col.format,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
        editable: col.edit,
        param: {
          name: col.name,
          type: col.format,
          dateTimeFormat: col.dateFormat || "YYYY-MM-DD",
          enumOptions: col.enumOptions || "",
          queryId: Number(col.queryId),
        },
      }),
    };
    return result;
  });

  return editColumns.filter((col) => !col.hide);
}

const EditableContext = React.createContext();

function EditableCell(props) {
  const cellData = useContext(EditableContext);
  const { getFieldDecorator, handleChange } = cellData;

  const getInput = (column, type, data, param) => {
    const paramType = param.type || type;

    if (paramType === "boolean") {
      return (
        <Checkbox
          defaultValue={data || false}
          onChange={(e) => handleChange(e.target.checked, column, type)}
        />
      );
    } else if (paramType === "number") {
      return (
        <InputNumber onChange={(value) => handleChange(value, column, type)} />
      );
    }
    return (
      <ParameterValueInput
        type={paramType}
        parameter={param}
        enumOptions={param.enumOptions || ""}
        allowMultipleValues={false}
        onSelect={(value) => handleChange(value, column, type)}
      />
    );
  };

  const renderCell = () => {
    // eslint-disable-next-line react/prop-types
    const {
      editing,
      editable,
      dataIndex,
      param,
      title,
      inputType,
      record,
      children,
      ...restProps
    } = props;
    if (editing) {
      if (editable) {
        return (
          <td style={{ minWidth: 100 }} {...restProps}>
            <Form.Item style={{ margin: 0 }}>
              {getFieldDecorator(dataIndex, {
                rules: [
                  {
                    required: dataIndex === "id",
                    message: `Please Input ${title}!`,
                  },
                ],
                initialValue: record[dataIndex],
              })(getInput(dataIndex, inputType, record[dataIndex], param))}
            </Form.Item>
          </td>
        );
      }
      return (
        <td
          style={{ minWidth: 100, backgroundColor: "lightgray" }}
          {...restProps}
        >
          {children}
        </td>
      );
    }
    return (
      <td style={{ minWidth: 100 }} {...restProps}>
        {children}
      </td>
    );
  };

  return <EditableContext.Consumer>{renderCell}</EditableContext.Consumer>;
}

function EditableTable(props) {
  const currentUser = props.currentUser;
  const userName = currentUser.name;
  const {
    editTable,
    allowDelete,
    isSnapshotting,
    columns,
    dataSourceId,
    primaryKey,
    modifiedBy,
    updatedAt,
    startTime,
    endTime,
  } = props.options;
  const specialColumns = [
    primaryKey,
    modifiedBy,
    updatedAt,
    startTime,
    endTime,
  ];

  const bareQuery = {
    data_source_id: dataSourceId,
    user: currentUser,
    name: "Dummy Query",
    options: { parameters: [] },
    query: "select 1;",
  };

  const originalData = props.data;
  const [data, setData] = useState(originalData.rows);
  const [displayData, setDisplayData] = useState(originalData.rows);

  const [editingKey, setEditingKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [maxKey, setMaxKey] = useState(
    Math.max(...originalData.rows.map((r) => r.id))
  );
  const [tempKey, setTempKey] = useState(1);
  const [addedKeys, setAddedKeys] = useState([]);
  const [editingRow, setEditingRow] = useState({});
  const [queriesToRun, setQueriesToRun] = useState({});
  const [updating, setUpdating] = useState(false);
  const [searchCol, setSearchCol] = useState();
  const searchInputRef = useRef();

  function onPageChange(pageNumber) {
    setCurrentPage(pageNumber);
    cancel();
  }

  const isEditing = (record) => record[primaryKey] === editingKey;

  function cancel() {
    setEditingKey("");
    setEditingRow({});
  }

  function edit(row) {
    if (updatedAt) {
      row[updatedAt] = getCurrentTime();
    }
    if (startTime) {
      row[startTime] = getCurrentTime();
      row[endTime] = null;
    }
    if (modifiedBy) {
      row[modifiedBy] = userName;
    }
    setEditingKey(row[primaryKey]);
    setEditingRow(row);
  }

  function save(editKey) {
    const newQueries = queriesToRun;
    const editData = data.map((item) => {
      if (editKey === item[primaryKey]) {
        return editingRow;
      }
      return item;
    });
    setData(editData);
    if (addedKeys.filter((item) => item === editKey).length === 0) {
      newQueries[`add-${editKey}`] = formatCommand(commands.add, "", "", false);
      if (isSnapshotting) {
        newQueries[`update-${editKey}`] = formatCommand(
          commands.update,
          editKey,
          getCurrentTimeString(editingRow[startTime])
        );
      } else {
        newQueries[`delete-${editKey}`] = formatCommand(
          commands.delete,
          editKey
        );
      }
    } else {
      newQueries[`add-${editKey}`] = formatCommand(commands.add, "", "", true);
    }
    showSubmitMessage();
    setQueriesToRun(newQueries);
    setEditingKey("");
    setEditingRow({});
  }

  function deleteRow(editKey) {
    const editData = data.filter((item) => editKey !== item[primaryKey]);
    setData(editData);
    const newQueries = queriesToRun;
    delete newQueries[`add-${editKey}`];
    if (addedKeys.filter((item) => item === editKey).length > 0) {
      setAddedKeys(addedKeys.filter((item) => item !== editKey));
      if (editKey === maxKey) {
        setMaxKey(maxKey - 1);
        setTempKey(tempKey - 1);
      }
    } else {
      if (isSnapshotting) {
        newQueries[`update-${editKey}`] = formatCommand(
          commands.update,
          editKey,
          getCurrentTimeString()
        );
      } else {
        newQueries[`delete-${editKey}`] = formatCommand(
          commands.delete,
          editKey
        );
      }
      setQueriesToRun(newQueries);
    }
    showSubmitMessage();
  }

  function addRow() {
    const editData = data;
    const newRow = { [primaryKey]: maxKey + 1 };
    if (updatedAt) {
      newRow[updatedAt] = getCurrentTime();
    }
    if (startTime) {
      newRow[startTime] = getCurrentTime();
      newRow[endTime] = null;
    }
    if (modifiedBy) {
      newRow[modifiedBy] = userName;
    }
    Object.values(columns).forEach((col) => {
      if (!col.edit && !includes(specialColumns, col.name)) {
        newRow[col] = col.default;
      }
    });
    editData.push(newRow);
    setData(editData);
    setCurrentPage(editData.length / 10 + 1);
    setAddedKeys([...addedKeys, maxKey + 1]);
    setEditingKey(maxKey + 1);
    setEditingRow(newRow);
    setMaxKey(maxKey + 1);
  }

  function handleChange(value, column, columnType) {
    if (columnType === "datetime" && isDynamicDate(value)) {
      setEditingRow({ ...editingRow, [column]: getDynamicDate(value).value() });
    } else {
      setEditingRow({ ...editingRow, [column]: value });
    }
  }

  function showSubmitMessage() {
    notification.warning("Press submit button to make your changes permanent.");
  }

  function submitChanges() {
    const deleteQueries = [];
    const updateQueries = [];
    const insertQueries = [];
    forIn(queriesToRun, (v, k) => {
      if (k.startsWith("delete")) {
        deleteQueries.push(v);
      } else if (k.startsWith("add")) {
        insertQueries.push(v);
      } else if (k.startsWith("update")) {
        updateQueries.push(v);
      } else {
        // ignore for now
      }
    });
    setUpdating(true);
    const queryText =
      deleteQueries.join(" ") +
      updateQueries.join(" ") +
      insertQueries.join(" ") +
      "select 1;";
    new Query(bareQuery)
      .getQueryResultByText(0, queryText)
      .toPromise()
      .then(() => {
        notification.success("Table Updated Successfully!");
        setQueriesToRun({});
        setAddedKeys([]);
      })
      .catch((error) =>
        notification.error("Update Table failed.", error.errorMessage)
      )
      .finally(() => setUpdating(false));
  }

  const components = {
    body: {
      cell: EditableCell,
    },
  };

  const lastColumn = {
    name: "actions",
    type: "string",
    table: false,
    format: "string",
    edit: false,
    hide: false,
    title: "actions",
    dataIndex: "actions",
    alignContent: "left",
    render: (unused, row) => {
      const isEdit = isEditing(row);
      return isEdit ? (
        <span>
          <Popconfirm
            title="Confirm Save?"
            onConfirm={() => save(row[primaryKey])}
          >
            <a style={{ marginRight: 8 }}>Save</a>
          </Popconfirm>
          <a onClick={cancel}>Cancel</a>
        </span>
      ) : (
        <span>
          <a
            disabled={editingKey !== ""}
            onClick={() => edit(row)}
            style={{ marginRight: 8 }}
          >
            Edit
          </a>
          {allowDelete ||
          addedKeys.filter((item) => item === editingKey).length > 0 ? (
            <Popconfirm
              title="Sure to delete?"
              onConfirm={() => deleteRow(row[primaryKey])}
            >
              <a>Delete</a>
            </Popconfirm>
          ) : null}
        </span>
      );
    },
  };
  const renderColumns = [
    ...getDefaultColumnsOptions(columns, isEditing, primaryKey),
    lastColumn,
  ];

  function filterTable(event) {
    const searchTerm = event.target.value;
    if (searchCol && searchTerm !== "") {
      const filterData = data.filter((item) => {
        if (item[searchCol]) {
          return (
            item[searchCol].toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0
          );
        }
        return false;
      });
      setDisplayData(filterData);
    } else {
      setDisplayData(data);
    }
  }

  useEffect(() => {
    if (searchInputRef.current) {
      // pass value and fake event-like object
      searchInputRef.current.input.setValue("", { target: { value: "" } });
    }
  }, [data, searchCol, searchInputRef]);

  function formatCommand(command, editKey, currentTime, isNew) {
    let currentRowValues = "";
    const currentColumns = [];
    Object.entries(editingRow).forEach(([k, v]) => {
      if (columns[k]) {
        currentColumns.push(k);
        const col = columns[k];
        let value = v;
        if (col.name === primaryKey && isNew) {
          value = `(select max(${primaryKey}) from ${editTable}) + ${tempKey}`;
          setTempKey(tempKey + 1);
        } else if (col.type === "string" && v !== null) {
          value = "'" + v + "'";
        } else if (col.type === "datetime" && v) {
          value = "'" + getCurrentTimeString(v) + "'";
        }
        currentRowValues += currentRowValues === "" ? value : "," + value;
      }
    });
    return command
      .replace("{{table}}", editTable)
      .replace("{{primaryKey}}", primaryKey)
      .replace("{{currentKey}}", editKey)
      .replace("{{currentRowValues}}", currentRowValues)
      .replace("{{currentColumns}}", '"' + currentColumns.join('", "') + '"')
      .replace("{{endtime}}", endTime)
      .replace("{{endtime}}", endTime)
      .replace("{{currentTime}}", currentTime);
  }

  const contextData = props.form;
  contextData.handleChange = handleChange;

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={3}>
          <label htmlFor="search-col">Search in Column: </label>
        </Grid.Col>
        <Grid.Col span={4} style={{ marginRight: 16 }}>
          <Select
            id="search-col"
            className="form-control flex-fill w-100"
            onSelect={(value) => setSearchCol(value)}
          >
            {originalData.columns.map((col) => {
              const colName = col.name;
              return col.type === "string" ? (
                <Select.Option value={colName} key={`col-option-${colName}`}>
                  {colName}
                </Select.Option>
              ) : null;
            })}
          </Select>
        </Grid.Col>
        <Grid.Col span={16}>
          <Input.Search
            ref={searchInputRef}
            placeholder="Search..."
            onChange={filterTable}
            enterButton
          />
        </Grid.Col>
      </Grid.Row>
      <EditableContext.Provider value={contextData}>
        <Table
          components={components}
          bordered
          dataSource={displayData}
          columns={renderColumns}
          rowKey={(record) => record[primaryKey]}
          rowClassName="editable-row"
          pagination={{
            size: "small",
            position: "bottom",
            pageSize: 10,
            hideOnSinglePage: true,
            current: currentPage,
            onChange: onPageChange,
          }}
        />
      </EditableContext.Provider>
      <br />
      <Button
        type="primary"
        loading={updating}
        disabled={editingKey !== "" || isEqual(queriesToRun, {}) || updating}
        onClick={submitChanges}
        style={{ marginRight: 8 }}
      >
        Submit Changes
      </Button>
      <Button onClick={addRow} disabled={editingKey !== ""}>
        Add Row
      </Button>
    </React.Fragment>
  );
}

EditableTable.propTypes = {
  options: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  data: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  form: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  currentUser: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default function Renderer({ data, options, currentUser }) {
  const TableForm = Form.create()(EditableTable);
  if (
    !options.editTable ||
    !options.primaryKey ||
    !options.columns ||
    isEqual(options.columns, {})
  ) {
    return <React.Fragment />;
  }

  return <TableForm data={data} options={options} currentUser={currentUser} />;
}

Renderer.propTypes = RendererPropTypes;
