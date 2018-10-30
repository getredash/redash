import React from 'react';
import PropTypes from 'prop-types';
import { difference, map, uniq, zipObject } from 'lodash';
import Tabs from 'antd/lib/tabs';
import Select from 'antd/lib/select';

import { QueryData } from '@/components/proptypes';
import MapRenderer from './MapRenderer';

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

export default class MapEditor extends React.Component {
  static propTypes = {
    data: QueryData.isRequired,
    options: MapRenderer.Options.isRequired,
    updateOptions: PropTypes.func.isRequired,
  }

  updateClassify = (value) => {
    let groupNames;
    if (value === 'none') {
      groupNames = ['All'];
    } else {
      groupNames = uniq(map(this.props.data.rows, value));
    }
    const options = map(
      groupNames,
      g => ((this.props.options.groups && this.props.options.groups[g]) ||
            { color: MapRenderer.colorScale(g) }),
    );
    const groups = zipObject(groupNames, options);
    this.props.updateOptions({ groups, classify: value });
  }

  updateLatColName = value => this.props.updateOptions({ latColName: value })
  updateLonColName = value => this.props.updateOptions({ lonColName: value })
  updateColor = (name, color) => this.props.updateOptions({ groups: { ...this.options.groups, name: { color } } })
  updateClusterMarkers = e => this.props.updateOptions({ clusterMarkers: e.target.checked })
  updateMapTileUrl = e => this.props.updateOptions({ mapTileUrl: e.target.value })


  render() {
    const columnNames = this.props.data.columns.map(c => c.name);
    const opts = this.props.options;
    const columnOptions = without => map(
      difference(columnNames, without),
      c => <Select.Option key={c}>{c}</Select.Option>,
    );
    const groups = opts.groups || { All: { color: MapRenderer.colorScale('All') } };
    return (
      <Tabs defaultActiveKey="general" animated={false} tabBarGutter={0}>
        <Tabs.TabPane key="general" tab="General">
          <div className="form-group">
            <label className="control-label">Latitude Column Name</label>
            <Select
              name="form-control"
              value={opts.latColName}
              placeholder="Choose column..."
              onChange={this.updateLatColName}
            >
              {columnOptions([opts.classify, opts.lonColName])}
            </Select>
          </div>

          <div className="form-group">
            <label className="control-label">Longitude Column Name</label>
            <Select
              name="form-control"
              value={opts.lonColName}
              placeholder="Choose column..."
              onChange={this.updateLonColName}
            >
              {columnOptions([opts.classify, opts.latColName])}
            </Select>
          </div>

          <div className="form-group">
            <label className="control-label">Group By</label>
            <Select
              name="form-control"
              value={opts.classify}
              placeholder="Choose column..."
              onChange={this.updateClassify}
            >
              {columnOptions([opts.lonColName, opts.latColName])}
              <Select.Option value="none">none</Select.Option>
            </Select>
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane key="groups" tab="Groups">
          <table className="table table-condensed col-table">
            <thead>
              <th>Name</th>
              <th>Color</th>
            </thead>
            <tbody>
              {map(groups, (options, name) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    <input
                      className="form-control"
                      type="color"
                      value={options.color}
                      onChange={e => this.updateColor(name, e.target.value)}
                    />
                  </td>
                </tr>))}
            </tbody>
          </table>
        </Tabs.TabPane>
        <Tabs.TabPane key="map" tab="Map">
          <div className="checkbox">
            <label>
              <input type="checkbox" checked={opts.clusterMarkers} onChange={this.updateClusterMarkers} />
              <i className="input-helper" /> Cluster Markers
            </label>
          </div>

          <div className="form-group">
            <label className="control-label">Map Tiles</label>
            <select value={opts.mapTileUrl} className="form-control" onChange={this.updateMapTileUrl}>
              {mapTiles.map(tile => <option key={tile.url} value={tile.url}>{tile.name}</option>)}
            </select>
          </div>
        </Tabs.TabPane>
      </Tabs>
    );
  }
}
