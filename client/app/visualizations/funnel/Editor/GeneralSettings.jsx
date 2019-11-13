import { map } from 'lodash';
import React, { useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import * as Grid from 'antd/lib/grid';
import { EditorPropTypes } from '@/visualizations';

export default function GeneralSettings({ options, data, onOptionsChange }) {
  const columnNames = useMemo(() => map(data.columns, c => c.name), [data]);

  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

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
            data-test="Funnel.StepColumn"
            placeholder="Choose column..."
            defaultValue={options.stepCol.colName || undefined}
            onChange={colName => onOptionsChange({ stepCol: { colName: colName || null } })}
          >
            {map(columnNames, col => (
              <Select.Option key={col} data-test={`Funnel.StepColumn.${col}`}>{col}</Select.Option>
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
            data-test="Funnel.StepColumnTitle"
            defaultValue={options.stepCol.displayAs}
            onChange={event => onOptionsChangeDebounced({ stepCol: { displayAs: event.target.value } })}
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
            data-test="Funnel.ValueColumn"
            placeholder="Choose column..."
            defaultValue={options.valueCol.colName || undefined}
            onChange={colName => onOptionsChange({ valueCol: { colName: colName || null } })}
          >
            {map(columnNames, col => (
              <Select.Option key={col} data-test={`Funnel.ValueColumn.${col}`}>{col}</Select.Option>
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
            data-test="Funnel.ValueColumnTitle"
            defaultValue={options.valueCol.displayAs}
            onChange={event => onOptionsChangeDebounced({ valueCol: { displayAs: event.target.value } })}
          />
        </Grid.Col>
      </Grid.Row>


      <div className="m-b-15">
        <label htmlFor="funnel-editor-custom-sort">
          <Checkbox
            id="funnel-editor-custom-sort"
            data-test="Funnel.CustomSort"
            checked={!options.autoSort}
            onChange={event => onOptionsChange({ autoSort: !event.target.checked })}
          />
          <span>Custom Sorting</span>
        </label>
      </div>

      {!options.autoSort && (
        <React.Fragment>
          <Grid.Row type="flex" align="middle" className="m-b-15">
            <Grid.Col span={12}>
              <label htmlFor="funnel-editor-sort-column-name">Sort Column</label>
            </Grid.Col>
            <Grid.Col span={12}>
              <Select
                id="funnel-editor-sort-column-name"
                className="w-100"
                data-test="Funnel.SortColumn"
                allowClear
                placeholder="Choose column..."
                defaultValue={options.sortKeyCol.colName || undefined}
                onChange={colName => onOptionsChange({ sortKeyCol: { colName: colName || null } })}
              >
                {map(columnNames, col => (
                  <Select.Option key={col} data-test={`Funnel.SortColumn.${col}`}>{col}</Select.Option>
                ))}
              </Select>
            </Grid.Col>
          </Grid.Row>

          <Grid.Row type="flex" align="middle" className="m-b-15">
            <Grid.Col span={12}>
              <label htmlFor="funnel-editor-sort-reverse">Sort Order</label>
            </Grid.Col>
            <Grid.Col span={12}>
              <Select
                id="funnel-editor-sort-reverse"
                className="w-100"
                data-test="Funnel.SortDirection"
                disabled={!options.sortKeyCol.colName}
                defaultValue={options.sortKeyCol.reverse ? 'desc' : 'asc'}
                onChange={order => onOptionsChange({ sortKeyCol: { reverse: order === 'desc' } })}
              >
                <Select.Option value="asc" data-test="Funnel.SortDirection.Ascending">ascending</Select.Option>
                <Select.Option value="desc" data-test="Funnel.SortDirection.Descending">descending</Select.Option>
              </Select>
            </Grid.Col>
          </Grid.Row>
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
