import { includes } from "lodash";
import React from "react";
import * as Grid from "antd/lib/grid";
import Input from "antd/lib/input";
import Select from "antd/lib/select";
import Checkbox from "antd/lib/checkbox";
import { EditorPropTypes } from "@/visualizations";

const columnFormats = [
  "string",
  "number",
  "boolean",
  "datetime",
  "enum",
  "query",
];

export default function ColumnSettings({
  options,
  onOptionsChange,
  specialColumns,
}) {
  function updateColumns(columnName, key, value) {
    const changedColumn = { ...options.columns[columnName], [key]: value };
    onOptionsChange({
      columns: { ...options.columns, [columnName]: changedColumn },
    });
  }

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={2}>
          <h6>Hide</h6>
        </Grid.Col>
        <Grid.Col span={3}>
          <h6>Editable</h6>
        </Grid.Col>
        <Grid.Col span={8}>
          <h6>Column Name</h6>
        </Grid.Col>
        <Grid.Col span={11}>
          <h6>Column Type</h6>
        </Grid.Col>
      </Grid.Row>
      {Object.values(options.columns)
        .filter((c) => c.table)
        .map((col) => (
          <React.Fragment key={`fragment-${col.name}`}>
            <Grid.Row
              key={`format-row-${col.name}`}
              type="flex"
              align="middle"
              className="m-b-10"
            >
              <Grid.Col key={`hide-col-${col.name}`} span={2}>
                <Checkbox
                  key={`hide-checkbox-${col.name}`}
                  data-test={"EditGrid.Column.Hide." + col.name}
                  defaultChecked={col.hide}
                  onChange={(e) =>
                    updateColumns(col.name, "hide", e.target.checked)
                  }
                />
              </Grid.Col>
              <Grid.Col key={`edit-col-${col.name}`} span={3}>
                <Checkbox
                  key={`edit-checkbox-${col.name}`}
                  data-test={"EditGrid.Column.Edit." + col.name}
                  defaultChecked={col.edit}
                  onChange={(e) =>
                    updateColumns(col.name, "edit", e.target.checked)
                  }
                />
              </Grid.Col>
              <Grid.Col key={`format-col-${col.name}`} span={8}>
                <label
                  key={`format-label-${col.name}`}
                  htmlFor={`choose-${col.name}-format`}
                >
                  {col.name}
                </label>
              </Grid.Col>
              <Grid.Col key={`format-select-col-${col.name}`} span={11}>
                <Select
                  id={`choose-${col.name}-format`}
                  data-test={"EditGrid.Column.Format." + col.name}
                  key={`format-select-${col.name}`}
                  className="form-control flex-fill w-100"
                  defaultValue={col.format}
                  onSelect={(value) => updateColumns(col.name, "format", value)}
                >
                  {columnFormats.map((format) => (
                    <Select.Option
                      value={format}
                      key={`${col.name}-option-${format}`}
                    >
                      {format}
                    </Select.Option>
                  ))}
                </Select>
              </Grid.Col>
            </Grid.Row>

            {col.format === "datetime" ? (
              <Grid.Row
                key={`dateFormat-column-${col.name}`}
                type="flex"
                align="middle"
                className="m-b-10"
              >
                <Grid.Col key={`dateFormat-col-${col.name}`} span={8}>
                  <label
                    key={`dateFormat-label-${col.name}`}
                    htmlFor={`dateFormat-data-${col.name}`}
                  >
                    Date Format:
                  </label>
                </Grid.Col>
                <Grid.Col key={`dateFormat-select-col-${col.name}`} span={16}>
                  <Input
                    key={`dateFormat-data-${col.name}`}
                    data-test={"EditGrid.Column.DateFormat." + col.name}
                    placeholder="YYYY-MM-DDTHH:mm:ss"
                    value={col.dateFormat}
                    onChange={(event) =>
                      updateColumns(col.name, "dateFormat", event.target.value)
                    }
                  />
                </Grid.Col>
              </Grid.Row>
            ) : null}

            {col.format === "enum" ? (
              <Grid.Row
                key={`enumOptions-column-${col.name}`}
                type="flex"
                align="middle"
                className="m-b-10"
              >
                <Grid.Col key={`enumOptions-select-col-${col.name}`} span={24}>
                  <Input.TextArea
                    key={`enumOptions-data-${col.name}`}
                    rows={4}
                    data-test={"EditGrid.Column.EnumOptions." + col.name}
                    placeholder="Dropdown Options ..."
                    value={col.enumOptions}
                    onChange={(event) =>
                      updateColumns(col.name, "enumOptions", event.target.value)
                    }
                  />
                </Grid.Col>
              </Grid.Row>
            ) : null}

            {col.format === "query" ? (
              <Grid.Row
                key={`queryId-column-${col.name}`}
                type="flex"
                align="middle"
                className="m-b-10"
              >
                <Grid.Col key={`queryId-col-${col.name}`} span={8}>
                  <label
                    key={`queryId-label-${col.name}`}
                    htmlFor={`queryId-data-${col.name}`}
                  >
                    Query Id:
                  </label>
                </Grid.Col>
                <Grid.Col key={`queryId-select-col-${col.name}`} span={16}>
                  <Input
                    key={`queryId-data-${col.name}`}
                    data-test={"EditGrid.Column.QueryId." + col.name}
                    value={col.queryId}
                    onChange={(event) =>
                      updateColumns(col.name, "queryId", event.target.value)
                    }
                  />
                </Grid.Col>
              </Grid.Row>
            ) : null}

            {!col.edit && !includes(specialColumns, col.name) ? (
              <Grid.Row
                key={`default-column-${col.name}`}
                type="flex"
                align="middle"
                className="m-b-10"
              >
                <Grid.Col key={`default-col-${col.name}`} span={8}>
                  <label
                    key={`default-label-${col.name}`}
                    htmlFor={`default-data-${col.name}`}
                  >
                    Default Value:
                  </label>
                </Grid.Col>
                <Grid.Col key={`default-select-col-${col.name}`} span={16}>
                  <Input
                    key={`default-data-${col.name}`}
                    data-test={"EditGrid.Column.Default." + col.name}
                    placeholder="Default Value..."
                    value={col.default}
                    onChange={(event) =>
                      updateColumns(col.name, "default", event.target.value)
                    }
                  />
                </Grid.Col>
              </Grid.Row>
            ) : null}
          </React.Fragment>
        ))}
    </React.Fragment>
  );
}

ColumnSettings.propTypes = EditorPropTypes;
