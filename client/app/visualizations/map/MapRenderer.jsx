import React from 'react';
import PropTypes from 'prop-types';
import { each, flatMap, groupBy, keys, map, zipObject } from 'lodash';
import d3 from 'd3';
import L from 'leaflet';
import { AttributionControl, Map, LayersControl, TileLayer } from 'react-leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { onResize } from '@/directives/resize-event';
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

const MapOptions = PropTypes.shape({
  mapTileUrl: PropTypes.string,
  latColName: PropTypes.string,
  lonColName: PropTypes.string,
  classify: PropTypes.string.isRequired,
  clusterMarkers: PropTypes.bool.isRequired,
  groups: PropTypes.objectOf(PropTypes.exact({
    color: PropTypes.string.isRequired,
  })),
});

function createDescription(latCol, lonCol, row) {
  const lat = row[latCol];
  const lon = row[lonCol];

  let description = '<ul style="list-style-type: none;padding-left: 0">';
  description += `<li><strong>${lat}, ${lon}</strong>`;

  each(row, (v, k) => {
    if (!(k === latCol || k === lonCol)) {
      description += `<li>${k}: ${v}</li>`;
    }
  });

  return description;
}

function createIcon(color, cluster) {
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
}

function heatpoint(lat, lon, color) {
  const style = {
    fillColor: color,
    fillOpacity: 0.9,
    stroke: false,
  };

  return L.circleMarker([lat, lon], style);
}

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

  componentDidUpdate() {
    this.mapControls.leafletElement._map.eachLayer(l => l._url || this.mapControls.leafletElement._map.removeLayer(l));
    this.drawMarkers(this.mapControls);
  }

  makeLayer = (points, name, mapControls, layers, groupColors) => {
    const latCol = this.props.options.latColName || 'lat';
    const lonCol = this.props.options.lonColName || 'lon';
    const classify = this.props.options.classify;
    const color = groupColors[name].color;
    let markers;
    if (this.props.options.clusterMarkers) {
      markers = L.markerClusterGroup({ iconCreateFunction: classify ? cluster => createIcon(color, cluster) : null });
    } else {
      markers = L.layerGroup();
    }
    // create markers
    each(points, (row) => {
      let marker;

      const lat = row[latCol];
      const lon = row[lonCol];

      if (lat === null || lon === null) return;

      if (classify && classify !== 'none') {
        marker = heatpoint(lat, lon, color);
      } else {
        marker = L.marker([lat, lon]);
      }

      marker.bindPopup(createDescription(latCol, lonCol, row));
      markers.addLayer(marker);
    });
    layers.push(markers);
    mapControls.addOverlay(markers, name, true);
  }

  drawMarkers = (mapControls) => {
    this.mapControls = mapControls;
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
    const layers = [];
    each(
      pointGroups,
      (points, name) => this.makeLayer(points, name, mapControls, layers, zipObject(groupNames, groupColors)),
    );
    const setBounds = () => {
      const b = this.props.options.bounds;
      if (b) {
        mapControls.leafletElement._map.fitBounds([[b._southWest.lat, b._southWest.lng],
          [b._northEast.lat, b._northEast.lng]]);
      } else if (layers.length) {
        const allMarkers = flatMap(layers, l => l.getLayers());
        // eslint-disable-next-line new-cap
        const group = new L.featureGroup(allMarkers);
        mapControls.leafletElement._map.fitBounds(group.getBounds());
      }
    };
    const resize = () => {
      mapControls.leafletElement._map.invalidateSize(false);
      setBounds();
    };
    setBounds();
    onResize(this.containerRef.current, resize);
  }
  containerRef = React.createRef()

  render() {
    if (!this.props.data) return null;
    return (
      <div className="map-visualization-container" ref={this.containerRef}>
        <Map
          center={[0, 0]}
          maxZoom={16}
          zoom={4}
          zoomSnap={1}
          scrollWheelZoom={false}
          maxBoundsViscosity={1}
          attributionControl={false}
          fullscreenControl
        >

          <TileLayer
            url={this.props.options.mapTileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
            attribution={'&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          />
          <LayersControl ref={this.drawMarkers} />
          <AttributionControl />
        </Map>
      </div>);
  }
}
