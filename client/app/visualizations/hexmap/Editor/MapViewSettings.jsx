import React from 'react';
import * as Grid from 'antd/lib/grid';
import InputNumber from 'antd/lib/input-number';
import { EditorPropTypes } from '@/visualizations';
import { minZoom, maxZoom } from '../utils';

export default function MapViewSettings({ options, onOptionsChange }) {
  return (
    <React.Fragment>
      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-zoom">Map Zoom Level</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="hexmap-zoom"
            min={minZoom}
            max={maxZoom}
            step={0.0001}
            className="w-100"
            data-test="Hexmap.MapView.Zoom"
            value={options.zoom}
            onChange={zoom => onOptionsChange({ zoom })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-center-lat">Map Center Latitude</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="hexmap-center-lat"
            step={0.0001}
            className="w-100"
            data-test="Hexmap.MapView.CenterLat"
            disabled={options.setMapCenter}
            value={options.centerLat}
            onChange={centerLat => onOptionsChange({ centerLat })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-center-lon">Map Center Longitude</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="hexmap-center-lon"
            step={0.0001}
            className="w-100"
            data-test="Hexmap.MapView.CenterLon"
            disabled={options.setMapCenter}
            value={options.centerLon}
            onChange={centerLon => onOptionsChange({ centerLon })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-bearing">Map Bearing Level</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="hexmap-bearing"
            step={0.0001}
            className="w-100"
            data-test="Hexmap.MapView.Bearing"
            value={options.bearing}
            onChange={bearing => onOptionsChange({ bearing })}
          />
        </Grid.Col>
      </Grid.Row>

      <Grid.Row type="flex" align="middle" className="m-b-10">
        <Grid.Col span={12}>
          <label htmlFor="hexmap-pitch">Map Pitch Level</label>
        </Grid.Col>
        <Grid.Col span={12}>
          <InputNumber
            id="hexmap-pitch"
            step={0.0001}
            className="w-100"
            data-test="Hexmap.MapView.Pitch"
            value={options.pitch}
            onChange={pitch => onOptionsChange({ pitch })}
          />
        </Grid.Col>
      </Grid.Row>
    </React.Fragment>
  );
}

MapViewSettings.propTypes = EditorPropTypes;
