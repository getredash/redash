import { map, merge } from 'lodash';
import React, { useMemo } from 'react';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Switch from 'antd/lib/switch';
import * as Grid from 'antd/lib/grid';
import { EditorPropTypes } from '@/visualizations';

export default function Editor({ options, data, onOptionsChange }) {
  const columnNames = useMemo(() => map(data.columns, c => c.name), [data]);

  const optionsChanged = (newOptions) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-step-column-name">Step Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="funnel-editor-step-column-name"
            className="w-100"
            defaultValue={options.stepCol.colName}
            onChange={colName => optionsChanged({ stepCol: { colName } })}
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
            onChange={event => optionsChanged({ stepCol: { displayAs: event.target.value } })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-value-column-name">Value Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="funnel-editor-value-column-name"
            className="w-100"
            defaultValue={options.valueCol.colName}
            onChange={colName => optionsChanged({ valueCol: { colName } })}
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
            onChange={event => optionsChanged({ valueCol: { displayAs: event.target.value } })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="funnel-editor-auto-sort-values">Sort Values</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Switch
            id="funnel-editor-auto-sort-values"
            defaultChecked={options.autoSort}
            onChange={autoSort => optionsChanged({ autoSort })}
          />
        </Grid.Col>
      </Grid.Row>

      {!options.autoSort && (
        <Grid.Row type="flex" align="middle" className="m-b-15">
          <Grid.Col span={12}>
            <label htmlFor="funnel-editor-sort-column-name">Sort Column Name</label>
          </Grid.Col>
          <Grid.Col span={12}>
            <Select
              id="funnel-editor-sort-column-name"
              className="w-100"
              defaultValue={options.sortKeyCol.colName}
              onChange={colName => optionsChanged({ sortKeyCol: { colName } })}
            >
              {map(columnNames, col => (
                <Select.Option key={col}>{col}</Select.Option>
              ))}
            </Select>
          </Grid.Col>
        </Grid.Row>
      )}
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
