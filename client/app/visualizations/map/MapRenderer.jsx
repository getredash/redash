import React from 'react';
import PropTypes from 'prop-types';
import { compact, groupBy, includes, isNumber, keys, map, zipObject } from 'lodash';
import d3 from 'd3';
import L from 'leaflet';
import { CircleMarker, Map, Marker, LayersControl, LayerGroup, Popup, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';

import { QueryData } from '@/components/proptypes';

/*
This is a workaround for an issue with giving Leaflet load the icon on its own.
*/
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});

delete L.Icon.Default.prototype._getIconUrl;

const MapOptions = PropTypes.exact({
  mapTileUrl: PropTypes.string,
  latColName: PropTypes.string,
  lonColName: PropTypes.string,
  classify: PropTypes.string.isRequired,
  clusterMarkers: PropTypes.bool.isRequired,
  groups: PropTypes.objectOf(PropTypes.exact({
    color: PropTypes.string.isRequired,
  })),
});

export default class MapRenderer extends React.Component {
  static Options = MapOptions
  static colorScale = d3.scale.category10();

  static DEFAULT_OPTIONS = Object.freeze({
    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 2,
    classify: 'none',
    clusterMarkers: true,
  })

  static propTypes = {
    data: QueryData.isRequired,
    options: MapOptions.isRequired,
  }

  createIcon = (color, cluster) => {
    const childCount = cluster.getChildCount();
    let c = ' marker-cluster-';
    if (childCount < 10) {
      c += 'small';
    } else if (childCount < 100) {
      c += 'medium';
    } else {
      c += 'large';
    }
    c = '';
    const style = `color: white; background-color: ${color};`;
    return L.divIcon({
      html: `<div style="${style}"><span>${childCount}</span></div>`,
      className: `marker-cluster${c}`,
      iconSize: new L.Point(40, 40),
    });
  };

  makeLayer = (points, name, groupColors) => {
    const latCol = this.props.options.latColName || 'lat';
    const lonCol = this.props.options.lonColName || 'lon';
    const classify = this.props.options.classify;
    const color = groupColors[name].color;
    const markers = compact(map(points, (row) => {
      const lat = row[latCol];
      const lon = row[lonCol];
      if (!isNumber(lat) || !isNumber(lon)) return;
      const description = (
        <Popup position={[lat, lon]}>
          <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
            <li><strong>{lat}, {lon}</strong></li>
            {map(row, (v, k) => !includes([latCol, lonCol], k) &&
              <li>{k}: {v}</li>)}
          </ul>
        </Popup>);
      if (classify && classify !== 'none') {
        return (
          <CircleMarker key={`${lat}${lon}`} center={[lat, lon]} fillColor={color} fillOpacity={0.9} stroke={false}>
            {description}
          </CircleMarker>);
      }
      return <Marker key={`${lat}${lon}`} position={[lat, lon]}>{description}</Marker>;
    }));
    return (
      <LayersControl.Overlay checked key={name} name={name}>
        {this.props.options.clusterMarkers ?
          <MarkerClusterGroup key={name} iconCreateFunction={cluster => this.createIcon(color, cluster)}>
            {markers}
          </MarkerClusterGroup> :
          <LayerGroup key={name}>
            {markers}
          </LayerGroup>}
      </LayersControl.Overlay>);
  }

  containerRef = React.createRef()

  render() {
    if (!this.props.data) return null;
    let pointGroups;
    if (this.props.options.classify && this.props.options.classify !== 'none') {
      pointGroups = groupBy(this.props.data.rows, this.props.options.classify);
    } else {
      pointGroups = { All: this.props.data.rows };
    }
    const groupNames = keys(pointGroups);
    const groupColors = map(groupNames, (group) => {
      if (this.props.options.groups && this.props.options.groups[group]) {
        return this.props.options.groups[group];
      }
      return { color: MapRenderer.colorScale(group) };
    });
    const markerLayers = map(
      pointGroups,
      (points, name) => this.makeLayer(points, name, zipObject(groupNames, groupColors)),
    );
    return (
      <div className="map-visualization-container">
        <Map
          center={[14, 0]}
          ref={this.mapRef}
          maxZoom={16}
          zoom={1}
          zoomSnap={0}
          scrollWheelZoom={false}
          maxBoundsViscosity={1}
          attributionControl={false}
          fullscreenControl
        >

          <TileLayer
            url={this.props.options.mapTileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution={'&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          />
          <LayersControl>
            {markerLayers}
          </LayersControl>
        </Map>
      </div>);
  }
}
