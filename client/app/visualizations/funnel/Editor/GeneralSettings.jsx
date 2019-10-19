import { map } from 'lodash';
import React, { useMemo } from 'react';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Switch from 'antd/lib/switch';
import * as Grid from 'antd/lib/grid';
import { EditorPropTypes } from '@/visualizations';

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const columnNames = useMemo(() => map(data.columns, c => c.name), [data]);

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-step-column-name">Step Column</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="funnel-editor-step-column-name"
            className="w-100"
            placeholder="Choose column..."
            defaultValue={options.stepCol.colName || undefined}
            onChange={colName => onOptionsChange({ stepCol: { colName: colName || null } })}
          >
            {map(columnNames, col => (
              <Select.Option key={col}>{col}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-step-column-title">Step Column Title</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="funnel-editor-step-column-title"
            className="w-100"
            defaultValue={options.stepCol.displayAs}
            onChange={event => onOptionsChange({ stepCol: { displayAs: event.target.value } })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-value-column-name">Value Column</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="funnel-editor-value-column-name"
            className="w-100"
            placeholder="Choose column..."
            defaultValue={options.valueCol.colName || undefined}
            onChange={colName => onOptionsChange({ valueCol: { colName: colName || null } })}
          >
            {map(columnNames, col => (
              <Select.Option key={col}>{col}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-value-column-title">Value Column Title</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="funnel-editor-value-column-title"
            className="w-100"
            defaultValue={options.valueCol.displayAs}
            onChange={event => onOptionsChange({ valueCol: { displayAs: event.target.value } })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-sort-column-name">Sort Column</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="funnel-editor-sort-column-name"
            className="w-100"
            allowClear
            placeholder="Choose column..."
            defaultValue={options.sortKeyCol.colName || undefined}
            onChange={colName => onOptionsChange({ sortKeyCol: { colName: colName || null } })}
          >
            {map(columnNames, col => (
              <Select.Option key={col}>{col}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-sort-reverse">Reverse Order</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Switch
            id="funnel-editor-sort-reverse"
            defaultChecked={options.sortKeyCol.reverse}
            onChange={reverse => onOptionsChange({ sortKeyCol: { reverse } })}
          />
        </Grid.Col>
      </Grid.Row>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
