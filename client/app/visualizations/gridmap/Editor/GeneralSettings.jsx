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
        <Grid.Col span={12}>
          <label htmlFor="gridmap-lat-col">Latitude Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="gridmap-lat-col"
            className="w-100"
            data-test="Gridmap.General.Latitude"
            defaultValue={options.latColName}
            onChange={latColName => onOptionsChange({ latColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Gridmap.General.Latitude.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="gridmap-lon-col">Longitude Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="gridmap-lon-col"
            className="w-100"
            data-test="Gridmap.General.Longitude"
            defaultValue={options.lonColName}
            onChange={lonColName => onOptionsChange({ lonColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Gridmap.General.Longitude.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="gridmap-cell-size">Cell Size in Pixel</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="gridmap-cell-size"
            className="w-100"
            data-test="Gridmap.General.CellSize"
            defaultValue={options.cellSize}
            onChange={cellSize => onOptionsChange({ cellSize })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="gridmap-elevation">Map Elevation Level</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="gridmap-elevation"
            className="w-100"
            data-test="Gridmap.General.Elevation"
            defaultValue={options.elevation}
            step={0.1}
            onChange={elevation => onOptionsChange({ elevation })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="gridmap-tooltip-label">Gridmap Tooltip Label</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="gridmap-tooltip-label"
            className="w-100"
            data-test="Gridmap.General.Label"
            defaultValue={options.tooltipLabel}
            placeholder={visualizationName}
            onChange={e => onOptionsChange({ tooltipLabel: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <label className="d-flex align-items-center" htmlFor="gridmap-set-map-center">
        <Switch
          id="gridmap-set-map-center"
          data-test="Gridmap.General.SetMapCenter"
          defaultChecked={options.setMapCenter}
          onChange={setMapCenter => onOptionsChange({ setMapCenter })}
        />
        <span className="m-l-10">Get Center Value from Data</span>
      </label>

      <label className="d-flex align-items-center" htmlFor="gridmap-set-max-domain">
        <Switch
          id="gridmap-set-max-domain"
          data-test="Gridmap.General.SetMaxDomain"
          defaultChecked={options.setMaxDomain}
          onChange={setMaxDomain => onOptionsChange({ setMaxDomain })}
        />
        <span className="m-l-10">Set Scale Values</span>
      </label>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="gridmap-max-count">Max Value for Scale</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="gridmap-max-count"
            className="w-100"
            data-test="Gridmap.General.MaxCount"
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
