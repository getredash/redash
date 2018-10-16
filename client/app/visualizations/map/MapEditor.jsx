import React from 'react';

import PropTypes from 'prop-types';
import { concat, difference, map, uniq, zipObject } from 'lodash';
import Select from 'react-select';
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
    data: PropTypes.object.isRequired,
    visualization: PropTypes.object.isRequired,
    updateVisualization: PropTypes.func.isRequired,
  }
  constructor(props) {
    super(props);
    this.state = {
      currentTab: 'general',
    };
  }

  changeTab = (event) => {
    this.setState({ currentTab: event.target.dataset.tabname });
  }

  updateOptions = changes => this.props.updateVisualization({
    ...this.props.visualization,
    options: { ...this.props.visualization.options, ...changes },
  })

  updateClassify = ({ value }) => {
    let groupNames;
    if (value === 'none') {
      groupNames = ['All'];
    } else {
      groupNames = uniq(map(this.props.data.rows, value));
    }
    const options = map(
      groupNames,
      g => ((this.props.visualization.options.groups && this.props.visualization.options.groups[g]) ||
            { color: MapRenderer.colorScale(g) }),
    );
    const groups = zipObject(groupNames, options);
    this.updateOptions({ groups, classify: value });
  }

  updateLatColName = ({ value }) => this.updateOptions({ latColName: value })
  updateLonColName = ({ value }) => this.updateOptions({ lonColName: value })
  updateColor = (name, color) => this.updateOptions({ groups: { ...this.options.groups, name: color } })
  updateClusterMarkers = e => this.updateOptions({ clusterMarkers: e.target.checked })
  updateMapTileUrl = e => this.updateOptions({ mapTileUrl: e.target.value })


  render() {
    const columnNames = this.props.data.columns.map(c => c.name);
    const opts = this.props.visualization.options;
    const columnOptions = without => concat(
      [{ value: '', label: '' }],
      map(difference(columnNames, without), c => ({ label: c, value: c })),
    );
    const groups = opts.groups || { All: { color: MapRenderer.colorScale('All') } };
    const tabs = {
      general: (
        <div className="m-t-10 m-b-10">
          <div className="form-group">
            <label className="control-label">Latitude Column Name</label>
            <Select
              name="form-control"
              required
              clearable={false}
              value={opts.latColName}
              placeholder="Choose column..."
              options={columnOptions([opts.classify, opts.lonColName])}
              onChange={this.updateLatColName}
            />
          </div>

          <div className="form-group">
            <label className="control-label">Longitude Column Name</label>
            <Select
              name="form-control"
              required
              clearable={false}
              value={opts.lonColName}
              placeholder="Choose column..."
              options={columnOptions([opts.classify, opts.latColName])}
              onChange={this.updateLonColName}
            />
          </div>

          <div className="form-group">
            <label className="control-label">Group By</label>
            <Select
              name="form-control"
              required
              clearable={false}
              value={opts.classify}
              placeholder="Choose column..."
              options={concat(columnOptions([opts.lonColName, opts.latColName]), [{ value: 'none', label: 'none' }])}
              onChange={this.updateClassify}
            />
          </div>
        </div>
      ),
      groups: (
        <div className="m-b-10">
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
        </div>

      ),
      map: (
        <div className="m-t-10 m-b-10">
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
        </div>
      ),
    };
    return (
      <div>
        <ul className="tab-nav">
          <li className={this.state.currentTab === 'general' ? 'active' : ''}>
            <a data-tabname="general" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>General</a>
          </li>
          <li className={this.state.currentTab === 'groups' ? 'active' : ''}>
            <a data-tabname="groups" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Groups</a>
          </li>
          <li className={this.state.currentTab === 'map' ? 'active' : ''}>
            <a data-tabname="map" tabIndex="-1" onKeyPress={this.changeTab} ng-click="true" onClick={this.changeTab}>Map Settings</a>
          </li>
        </ul>
        {tabs[this.state.currentTab]}
      </div>
    );
  }
}
