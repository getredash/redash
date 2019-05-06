import _ from 'lodash';
import d3 from 'd3';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import { angular2react } from 'angular2react';
import { registerVisualization } from '@/visualizations';

import template from './map.html';
import editorTemplate from './map-editor.html';

// This is a workaround for an issue with giving Leaflet load the icon on its own.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});

delete L.Icon.Default.prototype._getIconUrl;

const MAP_TILES = [
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

const DEFAULT_OPTIONS = {
  classify: 'none',
  clusterMarkers: true,
};

function heatpoint(lat, lon, color) {
  const style = {
    fillColor: color,
    fillOpacity: 0.9,
    stroke: false,
  };

  return L.circleMarker([lat, lon], style);
}

const createMarker = (lat, lon) => L.marker([lat, lon]);

function createDescription(latCol, lonCol, row) {
  const lat = row[latCol];
  const lon = row[lonCol];

  let description = '<ul style="list-style-type: none;padding-left: 0">';
  description += `<li><strong>${lat}, ${lon}</strong>`;

  _.each(row, (v, k) => {
    if (!(k === latCol || k === lonCol)) {
      description += `<li>${k}: ${v}</li>`;
    }
  });

  return description;
}

const MapRenderer = {
  template,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope, $element) {
    const colorScale = d3.scale.category10();
    const map = L.map($element[0].children[0].children[0], {
      scrollWheelZoom: false,
      fullscreenControl: true,
    });
    const mapControls = L.control.layers().addTo(map);
    const layers = {};
    const tileLayer = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    let mapMoveLock = false;

    const onMapMoveStart = () => {
      mapMoveLock = true;
    };

    const onMapMoveEnd = () => {
      this.options.bounds = map.getBounds();
      if (this.onOptionsChange) {
        this.onOptionsChange(this.options);
      }
    };

    const updateBounds = ({ disableAnimation = false } = {}) => {
      if (mapMoveLock) {
        return;
      }

      const b = this.options.bounds;

      if (b) {
        map.fitBounds([[b._southWest.lat, b._southWest.lng],
          [b._northEast.lat, b._northEast.lng]]);
      } else if (layers) {
        const allMarkers = _.flatten(_.map(_.values(layers), l => l.getLayers()));
        if (allMarkers.length > 0) {
          // eslint-disable-next-line new-cap
          const group = new L.featureGroup(allMarkers);
          const options = disableAnimation ? {
            animate: false,
            duration: 0,
          } : null;
          map.fitBounds(group.getBounds(), options);
        }
      }
    };

    map.on('focus', () => {
      map.on('movestart', onMapMoveStart);
      map.on('moveend', onMapMoveEnd);
    });
    map.on('blur', () => {
      map.off('movestart', onMapMoveStart);
      map.off('moveend', onMapMoveEnd);
    });

    const removeLayer = (layer) => {
      if (layer) {
        mapControls.removeLayer(layer);
        map.removeLayer(layer);
      }
    };

    const addLayer = (name, points) => {
      const latCol = this.options.latColName || 'lat';
      const lonCol = this.options.lonColName || 'lon';
      const classify = this.options.classify;

      let markers;
      if (this.options.clusterMarkers) {
        const color = this.options.groups[name].color;
        const options = {};

        if (classify) {
          options.iconCreateFunction = (cluster) => {
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
            return L.divIcon({ html: `<div style="${style}"><span>${childCount}</span></div>`, className: `marker-cluster${c}`, iconSize: new L.Point(40, 40) });
          };
        }

        markers = L.markerClusterGroup(options);
      } else {
        markers = L.layerGroup();
      }

      // create markers
      _.each(points, (row) => {
        let marker;

        const lat = row[latCol];
        const lon = row[lonCol];

        if (lat === null || lon === null) return;

        if (classify && classify !== 'none') {
          const groupColor = this.options.groups[name].color;
          marker = heatpoint(lat, lon, groupColor);
        } else {
          marker = createMarker(lat, lon);
        }

        marker.bindPopup(createDescription(latCol, lonCol, row));
        markers.addLayer(marker);
      });

      markers.addTo(map);

      layers[name] = markers;
      mapControls.addOverlay(markers, name);
    };

    const render = () => {
      const classify = this.options.classify;

      tileLayer.setUrl(this.options.mapTileUrl || '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      if (this.options.clusterMarkers === undefined) {
        this.options.clusterMarkers = true;
      }

      if (this.data) {
        let pointGroups;
        if (classify && classify !== 'none') {
          pointGroups = _.groupBy(this.data.rows, classify);
        } else {
          pointGroups = { All: this.data.rows };
        }

        const groupNames = _.keys(pointGroups);
        const options = _.map(groupNames, (group) => {
          if (this.options.groups && this.options.groups[group]) {
            return this.options.groups[group];
          }
          return { color: colorScale(group) };
        });

        this.options.groups = _.zipObject(groupNames, options);

        _.each(layers, (v) => {
          removeLayer(v);
        });

        _.each(pointGroups, (v, k) => {
          addLayer(k, v);
        });

        updateBounds({ disableAnimation: true });
      }
    };

    $scope.handleResize = () => {
      if (!map) return;
      map.invalidateSize(false);
      updateBounds({ disableAnimation: true });
    };

    $scope.$watch('$ctrl.data', render);
    $scope.$watch(() => _.omit(this.options, 'bounds'), render, true);
    $scope.$watch('$ctrl.options.bounds', updateBounds, true);
  },
};

const MapEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.setCurrentTab = (tab) => {
      this.currentTab = tab;
    };

    this.mapTiles = MAP_TILES;

    $scope.$watch('$ctrl.data.columns', () => {
      this.columns = this.data.columns;
      this.columnNames = _.map(this.columns, c => c.name);
      this.classifyColumns = [...this.columnNames, 'none'];
    });

    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);
  },
};

export default function init(ngModule) {
  ngModule.component('mapRenderer', MapRenderer);
  ngModule.component('mapEditor', MapEditor);

  ngModule.run(($injector) => {
    registerVisualization({
      type: 'MAP',
      name: 'Map (Markers)',
      getOptions: options => _.merge({}, DEFAULT_OPTIONS, options),
      Renderer: angular2react('mapRenderer', MapRenderer, $injector),
      Editor: angular2react('mapEditor', MapEditor, $injector),

      defaultColumns: 3,
      defaultRows: 8,
      minColumns: 2,
    });
  });
}

init.init = true;
