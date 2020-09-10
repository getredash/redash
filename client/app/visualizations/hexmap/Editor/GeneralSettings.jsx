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
          <label htmlFor="hexmap-lat-col">Latitude Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="hexmap-lat-col"
            className="w-100"
            data-test="Hexmap.General.Latitude"
            defaultValue={options.latColName}
            onChange={latColName => onOptionsChange({ latColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Hexmap.General.Latitude.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-lon-col">Longitude Column Name</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="hexmap-lon-col"
            className="w-100"
            data-test="Hexmap.General.Longitude"
            defaultValue={options.lonColName}
            onChange={lonColName => onOptionsChange({ lonColName })}
          >
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Hexmap.General.Longitude.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-tooltip-label">Hexmap Tooltip Label</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Input
            id="hexmap-tooltip-label"
            className="w-100"
            data-test="Hexmap.General.Label"
            defaultValue={options.tooltipLabel}
            placeholder={visualizationName}
            onChange={e => onOptionsChange({ tooltipLabel: e.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-tooltip-column">Tooltip Display Column</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <Select
            id="hexmap-tooltip-column"
            className="w-100"
            data-test="Hexmap.General.DisplayCol"
            defaultValue={options.displayCol}
            onSelect={displayCol => onOptionsChange({ displayCol })}
          >
            <Select.Option key="None" data-test="Hexmap.General.DisplayCol.None">No Selection</Select.Option>
            {map(data.columns, col => (
              <Select.Option key={col.name} data-test={'Hexmap.General.DisplayCol.' + col.name}>{col.name}</Select.Option>
            ))}
          </Select>
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={11}>
          <label htmlFor="hexmap-radius">Hexagon Radius</label>
          <InputNumber
            id="hexmap-radius"
            className="w-100"
            data-test="Hexmap.General.Radius"
            defaultValue={options.radius}
            onChange={radius => onOptionsChange({ radius })}
          />
        </Grid.Col>
        <Grid.Col span={1} />
        <Grid.Col span={11}>
          <label htmlFor="hexmap-elevation">Map Elevation Level</label>
          <InputNumber
            id="hexmap-elevation"
            className="w-100"
            data-test="Hexmap.General.Elevation"
            defaultValue={options.elevation}
            step={0.1}
            onChange={elevation => onOptionsChange({ elevation })}
          />
        </Grid.Col>
      </Grid.Row>

      <label className="d-flex align-items-center" htmlFor="hexmap-set-map-center">
        <Switch
          id="hexmap-set-map-center"
          data-test="Hexmap.General.SetMapCenter"
          defaultChecked={options.setMapCenter}
          onChange={setMapCenter => onOptionsChange({ setMapCenter })}
        />
        <span className="m-l-10">Get Center Value from Data</span>
      </label>

      <label className="d-flex align-items-center" htmlFor="hexmap-set-max-domain">
        <Switch
          id="hexmap-set-max-domain"
          data-test="Hexmap.General.SetMaxDomain"
          defaultChecked={options.setMaxDomain}
          onChange={setMaxDomain => onOptionsChange({ setMaxDomain })}
        />
        <span className="m-l-10">Set Scale Values</span>
      </label>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-max-count">Max Value for Scale</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="hexmap-max-count"
            className="w-100"
            data-test="Hexmap.General.MaxCount"
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
