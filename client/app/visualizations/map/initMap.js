import _, { each, flatten } from 'lodash';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'beautifymarker';
import 'beautifymarker/leaflet-beautify-marker-icon.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';

// This is a workaround for an issue with giving Leaflet load the icon on its own.
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});

delete L.Icon.Default.prototype._getIconUrl;

const iconAnchors = {
  marker: [14, 32],
  circle: [10, 10],
  rectangle: [11, 11],
  'circle-dot': [1, 2],
  'rectangle-dot': [1, 2],
  doughnut: [8, 8],
};

const popupAnchors = {
  rectangle: [0, -3],
  circle: [1, -3],
};

function createHeatpointMarker(lat, lon, color) {
  const style = {
    fillColor: color,
    fillOpacity: 0.9,
    stroke: false,
  };

  return L.circleMarker([lat, lon], style);
}

const createDefaultMarker = (lat, lon) => L.marker([lat, lon]);

function createIconMarker(lat, lon, { iconShape, iconFont, foregroundColor, backgroundColor, borderColor }) {
  const icon = L.BeautifyIcon.icon({
    iconShape,
    icon: iconFont,
    iconSize: iconShape === 'rectangle' ? [22, 22] : false,
    iconAnchor: iconAnchors[iconShape],
    popupAnchor: popupAnchors[iconShape],
    prefix: 'fa',
    textColor: foregroundColor,
    backgroundColor,
    borderColor,
  });

  return L.marker([lat, lon], { icon });
}

function createMarkerClusterGroup(classify, color) {
  const layerOptions = {};

  if (classify) {
    layerOptions.iconCreateFunction = (cluster) => {
      const childCount = cluster.getChildCount();

      let c = ' marker-cluster-';
      if (childCount < 10) {
        c += 'small';
      } else if (childCount < 100) {
        c += 'medium';
      } else {
        c += 'large';
      }

      c = ''; // TODO: wtf???

      const style = `color: white; background-color: ${color};`;
      return L.divIcon({
        html: `<div style="${style}"><span>${childCount}</span></div>`,
        className: `marker-cluster${c}`,
        iconSize: new L.Point(40, 40),
      });
    };
  }

  return L.markerClusterGroup(layerOptions);
}

function createDescription(lat, lon, row) {
  let description = '<ul style="list-style-type: none;padding-left: 0">';
  description += `<li><strong>${lat}, ${lon}</strong>`;

  each(row, (v, k) => {
    description += `<li>${k}: ${v}</li>`;
  });

  return description;
}

function createMarkersLayer(options, { color, points }) {
  const { classify, clusterMarkers, customizeMarkers } = options;

  const result = clusterMarkers ? createMarkerClusterGroup(classify, color) : L.layerGroup();

  // create markers
  each(points, ({ lat, lon, row }) => {
    let marker;
    if (classify) {
      marker = createHeatpointMarker(lat, lon, color);
    } else {
      if (customizeMarkers) {
        marker = createIconMarker(lat, lon, options);
      } else {
        marker = createDefaultMarker(lat, lon);
      }
    }

    marker.bindPopup(createDescription(lat, lon, row));
    result.addLayer(marker);
  });

  return result;
}

export default function initMap(container) {
  const map = L.map(container, {
    scrollWheelZoom: false,
    fullscreenControl: true,
  });
  const mapControls = L.control.layers().addTo(map);
  const layers = {};
  const tileLayer = L.tileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  let lastBounds = null;
  let onOptionsChange = null;

  let mapMoveLock = false;

  const onMapMoveStart = () => {
    mapMoveLock = true;
  };

  const onMapMoveEnd = () => {
    if (onOptionsChange) {
      onOptionsChange({ bounds: map.getBounds() });
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

  const updateBounds = (disableAnimation) => {
    if (mapMoveLock) {
      return;
    }

    if (lastBounds) {
      map.fitBounds([
        [lastBounds._southWest.lat, lastBounds._southWest.lng],
        [lastBounds._northEast.lat, lastBounds._northEast.lng],
      ]);
    } else if (layers) {
      const allMarkers = flatten(_.map(layers, l => l.getLayers()));
      if (allMarkers.length > 0) {
        const group = L.featureGroup(allMarkers);
        const config = disableAnimation ? {
          animate: false,
          duration: 0,
        } : null;
        map.fitBounds(group.getBounds(), config);
      }
    }
  };

  const render = (groups, options) => {
    tileLayer.setUrl(options.mapTileUrl || '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

    each(layers, (layer) => {
      mapControls.removeLayer(layer);
      map.removeLayer(layer);
    });

    each(groups, (group) => {
      const { name } = group;

      const markers = createMarkersLayer(options, group);
      markers.addTo(map);

      layers[name] = markers;
      mapControls.addOverlay(markers, name);
    });

    lastBounds = options.bounds;
    updateBounds(true);
  };

  // don't use this object after calling `destroy()` - let all this stuff to die
  return {
    render,
    get onOptionsChange() {
      return onOptionsChange;
    },
    set onOptionsChange(cb) {
      onOptionsChange = cb;
    },
    resize() {
      map.invalidateSize(false);
      updateBounds(true);
    },
    updateBounds(newBounds) {
      lastBounds = newBounds;
      updateBounds(false);
    },
    destroy() {
      map.remove();
    },
  };
}
