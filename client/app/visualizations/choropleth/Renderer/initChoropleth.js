import { isFunction, isObject, isArray, map } from "lodash";
import React from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-fullscreen";
import "leaflet-fullscreen/dist/leaflet.fullscreen.css";
import { formatSimpleTemplate } from "@/lib/value-format";
import { $sanitize } from "@/services/ng";
import resizeObserver from "@/services/resizeObserver";
import {
  createNumberFormatter,
  createScale,
  darkenColor,
  getColorByValue,
  getValueForFeature,
  prepareFeatureProperties,
} from "./utils";
import Legend from "./Legend";

const CustomControl = L.Control.extend({
  options: {
    position: "topright",
  },
  onAdd() {
    const div = document.createElement("div");
    div.className = "leaflet-bar leaflet-custom-toolbar";
    div.style.background = "#fff";
    div.style.backgroundClip = "padding-box";
    return div;
  },
  onRemove() {
    ReactDOM.unmountComponentAtNode(this.getContainer());
  },
});

function prepareLayer({ feature, layer, data, options, limits, colors, formatValue }) {
  const value = getValueForFeature(feature, data, options.countryCodeType);
  const valueFormatted = formatValue(value);
  const featureData = prepareFeatureProperties(feature, valueFormatted, data, options.countryCodeType);
  const color = getColorByValue(value, limits, colors, options.colors.noValue);

  layer.setStyle({
    color: options.colors.borders,
    weight: 1,
    fillColor: color,
    fillOpacity: 1,
  });

  if (options.tooltip.enabled) {
    layer.bindTooltip($sanitize(formatSimpleTemplate(options.tooltip.template, featureData)), { sticky: true });
  }

  if (options.popup.enabled) {
    layer.bindPopup($sanitize(formatSimpleTemplate(options.popup.template, featureData)));
  }

  layer.on("mouseover", () => {
    layer.setStyle({
      weight: 2,
      fillColor: darkenColor(color),
    });
  });
  layer.on("mouseout", () => {
    layer.setStyle({
      weight: 1,
      fillColor: color,
    });
  });
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
  function handleMapBoundsChange() {
    const bounds = _map.getBounds();
    onBoundsChange([
      [bounds._southWest.lat, bounds._southWest.lng],
      [bounds._northEast.lat, bounds._northEast.lng],
    ]);
  }

  let boundsChangedFromMap = false;
  const onMapMoveEnd = () => {
    handleMapBoundsChange();
  };
  _map.on("focus", () => {
    boundsChangedFromMap = true;
    _map.on("moveend", onMapMoveEnd);
  });
  _map.on("blur", () => {
    _map.off("moveend", onMapMoveEnd);
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
      onEachFeature(feature, layer) {
        prepareLayer({ feature, layer, data, options, limits, colors, formatValue });
      },
    }).addTo(_map);

    const bounds = _choropleth.getBounds();
    _map.fitBounds(options.bounds || bounds, { animate: false, duration: 0 });
    _map.setMaxBounds(bounds);

    // send updated bounds to editor; delay this to avoid infinite update loop
    setTimeout(() => {
      handleMapBoundsChange();
    }, 10);

    // update legend
    if (options.legend.visible && legend.length > 0) {
      _legend.setPosition(options.legend.position.replace("-", ""));
      _map.addControl(_legend);
      ReactDOM.render(
        <Legend
          items={map(legend, item => ({ ...item, text: formatValue(item.limit) }))}
          alignText={options.legend.alignText}
        />,
        _legend.getContainer()
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

  const unwatchResize = resizeObserver(container, () => {
    _map.invalidateSize(false);
  });

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
      _map.removeControl(_legend); // _map.remove() does not cleanup controls - bug in Leaflet?
      _map.remove();
    },
  };
}
