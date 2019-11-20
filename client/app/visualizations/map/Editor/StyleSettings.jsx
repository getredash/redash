import { isNil, map } from 'lodash';
import React, { useMemo } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Select from 'antd/lib/select';
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import Typography from 'antd/lib/typography';
import * as Grid from 'antd/lib/grid';
import ColorPicker from '@/components/ColorPicker';
import { EditorPropTypes } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';

const mapTiles = [
  {
    name: 'OpenStreetMap',
    url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap BW',
    url: '//{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap DE',
    url: '//{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap FR',
    url: '//{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap Hot',
    url: '//{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  },
  {
    name: 'Thunderforest',
    url: '//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
  },
  {
    name: 'Thunderforest Spinal',
    url: '//{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenMapSurfer',
    url: '//korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}',
  },
  {
    name: 'Stamen Toner',
    url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png',
  },
  {
    name: 'Stamen Toner Background',
    url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png',
  },
  {
    name: 'Stamen Toner Lite',
    url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenTopoMap',
    url: '//{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  },
];

const CustomColorPalette = {
  White: '#ffffff',
  ...ColorPalette,
};

function getCustomIconOptionFields(iconShape) {
  switch (iconShape) {
    case 'doughnut':
      return { showIcon: false, showBackgroundColor: true, showBorderColor: true };
    case 'circle-dot':
    case 'rectangle-dot':
      return { showIcon: false, showBackgroundColor: false, showBorderColor: true };
    default:
      return { showIcon: true, showBackgroundColor: true, showBorderColor: true };
  }
}

export default function StyleSettings({ options, onOptionsChange }) {
  const [debouncedOnOptionsChange] = useDebouncedCallback(onOptionsChange, 200);

  const { showIcon, showBackgroundColor, showBorderColor } = useMemo(
    () => getCustomIconOptionFields(options.iconShape),
    [options.iconShape],
  );

  const isCustomMarkersStyleAllowed = isNil(options.classify);

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="map-editor-tiles">Map Tiles</label>
        <Select
          data-test="Map.Editor.Tiles"
          id="map-editor-tiles"
          className="w-100"
          value={options.mapTileUrl}
          onChange={mapTileUrl => onOptionsChange({ mapTileUrl })}
        >
          {map(mapTiles, ({ name, url }) => (
            <Select.Option key={url} data-test={'Map.Editor.Tiles.' + name}>{name}</Select.Option>
          ))}
        </Select>
      </div>

      <h4 className="m-t-15 m-b-15">Markers</h4>

      <div className="m-b-15">
        <label htmlFor="map-editor-cluster-markers">
          <Checkbox
            id="map-editor-cluster-markers"
            data-test="Map.Editor.ClusterMarkers"
            defaultChecked={options.clusterMarkers}
            onChange={event => onOptionsChange({ clusterMarkers: event.target.checked })}
          />
          <span>Cluster Markers</span>
        </label>
      </div>

      <div className="m-b-15">
        <label htmlFor="map-editor-customize-markers">
          <Checkbox
            id="map-editor-customize-markers"
            data-test="Map.Editor.CustomizeMarkers"
            disabled={!isCustomMarkersStyleAllowed}
            defaultChecked={options.customizeMarkers}
            onChange={event => onOptionsChange({ customizeMarkers: event.target.checked })}
          />
          <Typography.Text disabled={!isCustomMarkersStyleAllowed}>Override default style</Typography.Text>
          {!isCustomMarkersStyleAllowed && (
            <Popover
              placement="topLeft"
              arrowPointAtCenter
              content={(
                <span>
                  Custom marker styles are not available<br />
                  when <b>Group By</b> column selected.
                </span>
              )}
            >
              <Icon className="m-l-5" type="question-circle" theme="filled" />
            </Popover>
          )}
        </label>
      </div>

      {isCustomMarkersStyleAllowed && options.customizeMarkers && (
        <React.Fragment>
          <Grid.Row type="flex" align="middle" className="m-b-10">
            <Grid.Col span={12}>
              <label htmlFor="map-editor-marker-shape">Shape</label>
            </Grid.Col>
            <Grid.Col span={12}>
              <Select
                id="map-editor-marker-shape"
                className="w-100"
                data-test="Map.Editor.MarkerShape"
                value={options.iconShape}
                onChange={iconShape => onOptionsChange({ iconShape })}
              >
                <Select.Option key="marker" data-test="Map.Editor.MarkerShape.marker">Marker + Icon</Select.Option>
                <Select.Option key="doughnut" data-test="Map.Editor.MarkerShape.doughnut">Circle</Select.Option>
                <Select.Option key="circle-dot" data-test="Map.Editor.MarkerShape.circle-dot">Circle Dot</Select.Option>
                <Select.Option key="circle" data-test="Map.Editor.MarkerShape.circle">Circle + Icon</Select.Option>
                <Select.Option key="rectangle-dot" data-test="Map.Editor.MarkerShape.rectangle-dot">Square Dot</Select.Option>
                <Select.Option key="rectangle" data-test="Map.Editor.MarkerShape.rectangle">Square + Icon</Select.Option>
              </Select>
            </Grid.Col>
          </Grid.Row>

          {showIcon && (
            <Grid.Row type="flex" align="middle" className="m-b-10">
              <Grid.Col span={12}>
                <label htmlFor="map-editor-marker-icon">
                  Icon
                  <Popover
                    placement="topLeft"
                    arrowPointAtCenter
                    content={(
                      <React.Fragment>
                        <div className="m-b-5">
                          Enter an icon name from{' '}
                          <a href="https://fontawesome.com/v4.7.0/icons/" target="_blank" rel="noopener noreferrer">Font-Awesome 4.7</a>
                        </div>
                        <div className="m-b-5">
                          Examples: <code>check</code>, <code>times-circle</code>, <code>flag</code>
                        </div>
                        <div>Leave blank to remove.</div>
                      </React.Fragment>
                    )}
                  >
                    <Icon className="m-l-5" type="question-circle" theme="filled" />
                  </Popover>
                </label>
              </Grid.Col>
              <Grid.Col span={12}>
                <Input
                  id="map-editor-marker-icon"
                  className="w-100"
                  data-test="Map.Editor.MarkerIcon"
                  defaultValue={options.iconFont}
                  onChange={event => debouncedOnOptionsChange({ iconFont: event.target.value })}
                />
              </Grid.Col>
            </Grid.Row>
          )}

          {showIcon && (
            <Grid.Row type="flex" align="middle" className="m-b-10">
              <Grid.Col span={12}>
                <label htmlFor="map-editor-marker-icon-color">Icon Color</label>
              </Grid.Col>
              <Grid.Col span={12} className="text-nowrap">
                <ColorPicker
                  id="map-editor-marker-icon-color"
                  interactive
                  presetColors={CustomColorPalette}
                  placement="topRight"
                  color={options.foregroundColor}
                  triggerProps={{ 'data-test': 'Map.Editor.MarkerIconColor' }}
                  onChange={foregroundColor => onOptionsChange({ foregroundColor })}
                />
                <ColorPicker.Label color={options.foregroundColor} presetColors={CustomColorPalette} />
              </Grid.Col>
            </Grid.Row>
          )}

          {showBackgroundColor && (
            <Grid.Row type="flex" align="middle" className="m-b-10">
              <Grid.Col span={12}>
                <label htmlFor="map-editor-marker-background-color">Background Color</label>
              </Grid.Col>
              <Grid.Col span={12} className="text-nowrap">
                <ColorPicker
                  id="map-editor-marker-background-color"
                  interactive
                  presetColors={CustomColorPalette}
                  placement="topRight"
                  color={options.backgroundColor}
                  triggerProps={{ 'data-test': 'Map.Editor.MarkerBackgroundColor' }}
                  onChange={backgroundColor => onOptionsChange({ backgroundColor })}
                />
                <ColorPicker.Label color={options.backgroundColor} presetColors={CustomColorPalette} />
              </Grid.Col>
            </Grid.Row>
          )}

          {showBorderColor && (
            <Grid.Row type="flex" align="middle" className="m-b-10">
              <Grid.Col span={12}>
                <label htmlFor="map-editor-marker-border-color">Border Color</label>
              </Grid.Col>
              <Grid.Col span={12} className="text-nowrap">
                <ColorPicker
                  id="map-editor-marker-border-color"
                  interactive
                  presetColors={CustomColorPalette}
                  placement="topRight"
                  color={options.borderColor}
                  triggerProps={{ 'data-test': 'Map.Editor.MarkerBorderColor' }}
                  onChange={borderColor => onOptionsChange({ borderColor })}
                />
                <ColorPicker.Label color={options.borderColor} presetColors={CustomColorPalette} />
              </Grid.Col>
            </Grid.Row>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

StyleSettings.propTypes = EditorPropTypes;
