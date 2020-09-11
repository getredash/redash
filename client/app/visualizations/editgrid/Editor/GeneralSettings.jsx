import { map } from "lodash";
import React from "react";
import * as Grid from "antd/lib/grid";
import Select from "antd/lib/select";
import Switch from "antd/lib/switch";
import { EditorPropTypes } from "@/visualizations";

export default function GeneralSettings({
  options,
  onOptionsChange,
  schema,
  tableColumns,
  commonColumns,
}) {
  function updateColumns(columnName, key, value, optionKey) {
    const changedColumn = { ...options.columns[columnName], [key]: value };
    onOptionsChange({
      columns: { ...options.columns, [columnName]: changedColumn },
      [optionKey]: columnName,
    });
  }

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="edit-table">Table to be Edited</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="edit-table"
            className="w-100"
            data-test="EditGrid.General.EditTable"
            defaultValue={options.editTable}
            onChange={(editTable) =>
              onOptionsChange({ editTable, columns: {} })
            }
            showSearch
            filterOption={(input, option) =>
              option.props.children
                .toLowerCase()
                .indexOf(input.toLowerCase()) >= 0
            }
          >
            {map(schema, (table) => (
              <Select.Option
                key={table.name}
                data-test={"EditGrid.General.EditTable." + table.name}
              >
                {table.name}
              </Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="edit-primary-key">Primary Key</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="edit-primary-key"
            className="w-100"
            data-test="EditGrid.General.PrimaryKey"
            defaultValue={options.primaryKey}
            onChange={(primaryKey) =>
              updateColumns(primaryKey, "edit", false, "primaryKey")
            }
            showSearch
            filterOption={(input, option) =>
              option.props.children
                .toLowerCase()
                .indexOf(input.toLowerCase()) >= 0
            }
          >
            {map(commonColumns, (col) => (
              <Select.Option
                key={col.name}
                data-test={"EditGrid.General.PrimaryKey." + col.name}
              >
                {col.name}
              </Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={8}>
          <label
            className="d-flex align-items-center"
            htmlFor="edit-is-marking-user"
          >
            <Switch
              id="edit-is-marking-user"
              data-test="EditGrid.General.IsMarkingUser"
              defaultChecked={options.isMarkingUser}
              onChange={(isMarkingUser) => onOptionsChange({ isMarkingUser })}
            />
            <span className="m-l-10">Mark User</span>
          </label>
        </Grid.Col>
        <Grid.Col span={8}>
          <label
            className="d-flex align-items-center"
            htmlFor="edit-is-versioning"
          >
            <Switch
              id="edit-is-versioning"
              data-test="EditGrid.General.IsVersioning"
              defaultChecked={options.isVersioning}
              onChange={(isVersioning) => onOptionsChange({ isVersioning })}
            />
            <span className="m-l-10">Version Data</span>
          </label>
        </Grid.Col>
        <Grid.Col span={8}>
          <label
            className="d-flex align-items-center"
            htmlFor="edit-is-snapshotting"
          >
            <Switch
              id="edit-is-snapshotting"
              data-test="EditGrid.General.IsSnapshotting"
              defaultChecked={options.isSnapshotting}
              onChange={(isSnapshotting) => onOptionsChange({ isSnapshotting })}
            />
            <span className="m-l-10">Snapshot Data</span>
          </label>
        </Grid.Col>
      </Grid.Row>

      {options.isMarkingUser ? (
        <Grid.Row type="flex" align="middle" className="m-b-10">
          <Grid.Col span={12}>
            <label htmlFor="edit-modified-by">Modified By User Column</label>
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              id="edit-modified-by"
              className="w-100"
              data-test="EditGrid.General.ModifiedBy"
              defaultValue={options.modifiedBy}
              onChange={(modifiedBy) =>
                updateColumns(modifiedBy, "edit", false, "modifiedBy")
              }
              showSearch
              filterOption={(input, option) =>
                option.props.children
                  .toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {map(tableColumns, (col) => (
                <Select.Option
                  key={col}
                  data-test={"EditGrid.General.ModifiedBy." + col}
                >
                  {col}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
        </Grid.Row>
      ) : null}

      {options.isVersioning ? (
        <Grid.Row type="flex" align="middle" className="m-b-10">
          <Grid.Col span={12}>
            <label htmlFor="edit-updated-at">Update Time Column</label>
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              id="edit-updated-at"
              className="w-100"
              data-test="EditGrid.General.UpdatedAt"
              defaultValue={options.updatedAt}
              onChange={(updatedAt) =>
                updateColumns(updatedAt, "edit", false, "updatedAt")
              }
              showSearch
              filterOption={(input, option) =>
                option.props.children
                  .toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {map(tableColumns, (col) => (
                <Select.Option
                  key={col}
                  data-test={"EditGrid.General.UpdatedAt." + col}
                >
                  {col}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
        </Grid.Row>
      ) : null}

      {options.isSnapshotting ? (
        <Grid.Row type="flex" align="middle" className="m-b-10">
          <Grid.Col span={11} style={{ marginRight: 10 }}>
            <label htmlFor="edit-start-time">Start Time Column</label>
            <Select
              id="edit-start-time"
              className="w-100"
              data-test="EditGrid.General.StartTime"
              defaultValue={options.startTime}
              onChange={(startTime) =>
                updateColumns(startTime, "edit", false, "startTime")
              }
              showSearch
              filterOption={(input, option) =>
                option.props.children
                  .toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {map(tableColumns, (col) => (
                <Select.Option
                  key={col}
                  data-test={"EditGrid.General.StartTime." + col}
                >
                  {col}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
          <Grid.Col span={11}>
            <label htmlFor="edit-end-time">End Time Column</label>
            <Select
              id="edit-end-time"
              className="w-100"
              data-test="EditGrid.General.EndTime"
              defaultValue={options.endTime}
              onChange={(endTime) =>
                updateColumns(endTime, "edit", false, "endTime")
              }
              showSearch
              filterOption={(input, option) =>
                option.props.children
                  .toLowerCase()
                  .indexOf(input.toLowerCase()) >= 0
              }
            >
              {map(tableColumns, (col) => (
                <Select.Option
                  key={col}
                  data-test={"EditGrid.General.EndTime." + col}
                >
                  {col}
                </Select.Option>
              ))}
            </Select>
          </Grid.Col>
        </Grid.Row>
      ) : null}

      <label className="d-flex align-items-center" htmlFor="edit-allow-delete">
        <Switch
          id="edit-allow-delete"
          data-test="EditGrid.General.AllowDelete"
          defaultChecked={options.allowDelete}
          onChange={(allowDelete) => onOptionsChange({ allowDelete })}
        />
        <span className="m-l-10">Allow Deletion of Rows</span>
      </label>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
