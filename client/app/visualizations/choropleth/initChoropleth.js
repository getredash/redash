import { isFunction, isObject, isArray, map } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import ColorPicker from '@/components/ColorPicker';
import { formatSimpleTemplate } from '@/lib/value-format';
import { $sanitize } from '@/services/ng';
import resizeObserver from '@/services/resizeObserver';
import {
  createNumberFormatter,
  createScale,
  darkenColor,
  getColorByValue,
  getValueForFeature,
  prepareFeatureProperties,
} from './utils';

const CustomControl = L.Control.extend({
  options: {
    position: 'topright',
  },
  onAdd() {
    const div = document.createElement('div');
    div.className = 'leaflet-bar leaflet-custom-toolbar';
    div.style.background = '#fff';
    div.style.backgroundClip = 'padding-box';
    return div;
  },
});

function ChoroplethLegend({ items, formatValue, alignText }) { // eslint-disable-line react/prop-types
  return (
    <div className="choropleth-visualization-legend">
      {map(items, (item, index) => (
        <div key={`legend${index}`} className="d-flex align-items-center">
          <ColorPicker.Swatch color={item.color} className="m-r-5" />
          <div className={`flex-fill text-${alignText}`}>{formatValue(item.limit)}</div>
        </div>
      ))}
    </div>
  );
}

export default function initChoropleth(container) {
  const _map = L.map(container, {
    center: [0.0, 0.0],
    zoom: 1,
    zoomSnap: 0,
    scrollWheelZoom: false,
    maxBoundsViscosity: 1,
    attributionControl: false,
    fullscreenControl: true,
  });
  let _choropleth = null;
  const _legend = new CustomControl();

  let onBoundsChange = () => {};
  let boundsChangedFromMap = false;
  const onMapMoveEnd = () => {
    const bounds = _map.getBounds();
    onBoundsChange([
      [bounds._southWest.lat, bounds._southWest.lng],
      [bounds._northEast.lat, bounds._northEast.lng],
    ]);
  };
  _map.on('focus', () => {
    boundsChangedFromMap = true;
    _map.on('moveend', onMapMoveEnd);
  });
  _map.on('blur', () => {
    _map.off('moveend', onMapMoveEnd);
    boundsChangedFromMap = false;
  });

  function updateLayers(geoJson, data, options) {
    _map.eachLayer(layer => _map.removeLayer(layer));
    _map.removeControl(_legend);

    if (!isObject(geoJson) || !isArray(geoJson.features)) {
      _choropleth = null;
      _map.setMaxBounds(null);
      return;
    }

    const { limits, colors, legend } = createScale(geoJson.features, data, options);
    const formatValue = createNumberFormatter(options.valueFormat, options.noValuePlaceholder);

    _choropleth = L.geoJSON(geoJson, {
      onEachFeature: (feature, layer) => {
        const value = getValueForFeature(feature, data, options.countryCodeType);
        const valueFormatted = formatValue(value);
        const featureData = prepareFeatureProperties(
          feature,
          valueFormatted,
          data,
          options.countryCodeType,
        );
        const color = getColorByValue(value, limits, colors, options.colors.noValue);

        layer.setStyle({
          color: options.colors.borders,
          weight: 1,
          fillColor: color,
          fillOpacity: 1,
        });

        if (options.tooltip.enabled) {
          layer.bindTooltip($sanitize(formatSimpleTemplate(
            options.tooltip.template,
            featureData,
          )), { sticky: true });
        }

        if (options.popup.enabled) {
          layer.bindPopup($sanitize(formatSimpleTemplate(
            options.popup.template,
            featureData,
          )));
        }

        layer.on('mouseover', () => {
          layer.setStyle({
            weight: 2,
            fillColor: darkenColor(color),
          });
        });
        layer.on('mouseout', () => {
          layer.setStyle({
            weight: 1,
            fillColor: color,
          });
        });
      },
    }).addTo(_map);

    // prevent `setMaxBounds` animation
    const bounds = _map.getBounds();
    const maxBounds = _choropleth.getBounds();
    _map.fitBounds(maxBounds, { animate: false, duration: 0 });
    _map.setMaxBounds(maxBounds);
    _map.fitBounds(bounds, { animate: false, duration: 0 });

    // update legend
    if (legend.length > 0) {
      _legend.setPosition(options.legend.position.replace('-', ''));
      _map.addControl(_legend);
      ReactDOM.render(
        <ChoroplethLegend items={legend} formatValue={formatValue} alignText={options.legend.alignText} />,
        _legend.getContainer(),
      );
    }
  }

  function updateBounds(bounds) {
    if (!boundsChangedFromMap) {
      const layerBounds = _choropleth ? _choropleth.getBounds() : _map.getBounds();
      bounds = bounds ? L.latLngBounds(bounds[0], bounds[1]) : layerBounds;
      if (bounds.isValid()) {
        _map.fitBounds(bounds, { animate: false, duration: 0 });
      }
    }
  }

  const unwatchResize = resizeObserver(container, () => { _map.invalidateSize(false); });

  return {
    get onBoundsChange() {
      return onBoundsChange;
    },
    set onBoundsChange(value) {
      onBoundsChange = isFunction(value) ? value : () => {};
    },
    updateLayers,
    updateBounds,
    destroy() {
      unwatchResize();
      ReactDOM.unmountComponentAtNode(_legend.getContainer());
      _map.remove();
    },
  };
}
