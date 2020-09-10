import { map } from 'lodash';
import React from 'react';
import * as Grid from 'antd/lib/grid';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Switch from 'antd/lib/switch';
import InputNumber from 'antd/lib/input-number';
import { EditorPropTypes } from '@/visualizations';

import { setMidLatLon } from '../utils';

export default function GeneralSettings({ options, data, visualizationName, onOptionsChange }) {
  if (!options.isCenterSet && options.latColName in data.rows[0] && options.lonColName in data.rows[0]) {
    setMidLatLon(data.rows, options, onOptionsChange);
  }

  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={11}>
          <label htmlFor="layermap-lat-col">Latitude Column</label>
          <Select
            id="layermap-lat-col"
            className="w-100"
            data-test="Layermap.General.Latitude"
            defaultValue={options.latColName}
            onChange={latColName => onOptionsChange({ latColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Layermap.General.Latitude.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
        <Grid.Col span={1} />
        <Grid.Col span={11}>
          <label htmlFor="layermap-lon-col">Longitude Column</label>
          <Select
            id="layermap-lon-col"
            className="w-100"
            data-test="Layermap.General.Longitude"
            defaultValue={options.lonColName}
            onChange={lonColName => onOptionsChange({ lonColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Layermap.General.Longitude.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={11}>
          <label htmlFor="layermap-group-col">Layer Name Column</label>
          <Select
            id="layermap-group-col"
            className="w-100"
            data-test="Layermap.General.GroupBy"
            defaultValue={options.groupByCol}
            onChange={groupByCol => onOptionsChange({ groupByCol })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Layermap.General.GroupBy.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
        <Grid.Col span={1} />
        <Grid.Col span={11}>
          <label htmlFor="layermap-group-col">Tooltip Display Column</label>
          <Select
            id="layermap-display-col"
            className="w-100"
            data-test="Layermap.General.DisplayCol"
            defaultValue={options.displayCol}
            onChange={displayCol => onOptionsChange({ displayCol })}
          >
            <Select.Option key="None" data-test="Layermap.General.DisplayCol.None">No Selection</Select.Option>
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Layermap.General.DisplayCol.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <label className="d-flex align-items-center" htmlFor="layermap-set-max-domain">
        <Switch
          id="layermap-set-weight-column"
          data-test="Layermap.General.SetWeightColumn"
          defaultChecked={options.setWeightColumn}
          onChange={setWeightColumn => onOptionsChange({ setWeightColumn })}
        />
        <span className="m-l-10">Get Weight from Data</span>
      </label>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="layermap-weight-col">Weight Column</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="layermap-weight-col"
            className="w-100"
            data-test="Layermap.General.WeightColumn"
            disabled={!options.setWeightColumn}
            defaultValue={options.weightCol}
            onChange={weightCol => onOptionsChange({ weightCol })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Layermap.General.GroupBy.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={24}>
          <label htmlFor="layermap-tooltip-label">Layermap Tooltip Label</label>
          <Input.TextArea
            id="layermap-tooltip-label"
            className="w-100"
            rows={2}
            data-test="Layermap.General.Label"
            defaultValue={options.tooltipLabel}
            placeholder={visualizationName}
            onChange={e => onOptionsChange({ tooltipLabel: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <label className="d-flex align-items-center" htmlFor="layermap-set-map-center">
        <Switch
          id="layermap-set-map-center"
          data-test="Layermap.General.SetMapCenter"
          defaultChecked={options.setMapCenter}
          onChange={setMapCenter => onOptionsChange({ setMapCenter })}
        />
        <span className="m-l-10">Get Center Value from Data</span>
      </label>

      <label className="d-flex align-items-center" htmlFor="set-max-domain">
        <Switch
          id="set-max-domain"
          data-test="Layermap.General.SetMaxDomain"
          defaultChecked={options.setMaxDomain}
          onChange={setMaxDomain => onOptionsChange({ setMaxDomain })}
        />
        <span className="m-l-10">Set Scale Values</span>
      </label>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="layermap-max-count">Max Value for Scale</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="layermap-max-count"
            className="w-100"
            data-test="Layermap.General.MaxCount"
            disabled={!options.setMaxDomain}
            defaultValue={options.maxCount}
            onChange={maxCount => onOptionsChange({ maxCount })}
          />
        </Grid.Col>
      </Grid.Row>
    </React.Fragment>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
