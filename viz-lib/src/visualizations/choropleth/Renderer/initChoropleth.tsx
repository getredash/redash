import { isFunction, isObject, isArray, map } from "lodash";
import React from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../leaflet.less";
import "leaflet-fullscreen";
import "leaflet-fullscreen/dist/leaflet.fullscreen.css";
import { formatSimpleTemplate } from "@/lib/value-format";
import sanitize from "@/services/sanitize";
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
    const root = (this as any)._reactRoot;
    (this as any)._reactRoot = null;
    // Leaflet removes controls while React may be rendering, so unmount afterwards
    if (root) {
      setTimeout(() => root.unmount());
    }
  },
  // Render React content into the control's container
  renderContent(element: React.ReactNode) {
    const control = this as any;
    if (!control._reactRoot) {
      control._reactRoot = createRoot(control.getContainer());
    }
    control._reactRoot.render(element);
  },
});

function prepareLayer({ feature, layer, data, options, limits, colors, formatValue }: any) {
  const value = getValueForFeature(feature, data, options.targetField);
  const valueFormatted = formatValue(value);
  const featureData = prepareFeatureProperties(feature, valueFormatted, data, options.targetField);
  const color = getColorByValue(value, limits, colors, options.colors.noValue);

  layer.setStyle({
    color: options.colors.borders,
    weight: 1,
    fillColor: color,
    fillOpacity: 1,
  });

  if (options.tooltip.enabled) {
    layer.bindTooltip(sanitize(formatSimpleTemplate(options.tooltip.template, featureData)), { sticky: true });
  }

  if (options.popup.enabled) {
    layer.bindPopup(sanitize(formatSimpleTemplate(options.popup.template, featureData)));
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

function validateBounds(bounds: any, fallbackBounds: any) {
  if (bounds) {
    bounds = L.latLngBounds(bounds[0], bounds[1]);
    if (bounds.isValid()) {
      return bounds;
    }
  }
  if (fallbackBounds && fallbackBounds.isValid()) {
    return fallbackBounds;
  }
  return null;
}

export default function initChoropleth(container: any, onBoundsChange: any) {
  const _map = L.map(container, {
    center: [0.0, 0.0],
    zoom: 1,
    zoomSnap: 0,
    scrollWheelZoom: false,
    maxBoundsViscosity: 1,
    attributionControl: false,
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ center: [number, number]; zoom... Remove this comment to see the full error message
    fullscreenControl: true,
  });
  let _choropleth: any = null;
  const _legend = new CustomControl();

  function handleMapBoundsChange() {
    if (isFunction(onBoundsChange)) {
      const bounds = _map.getBounds();
      onBoundsChange([
        // @ts-expect-error ts-migrate(2551) FIXME: Property '_southWest' does not exist on type 'LatL... Remove this comment to see the full error message
        [bounds._southWest.lat, bounds._southWest.lng],
        // @ts-expect-error ts-migrate(2551) FIXME: Property '_northEast' does not exist on type 'LatL... Remove this comment to see the full error message
        [bounds._northEast.lat, bounds._northEast.lng],
      ]);
    }
  }

  /**
   * Shows `bounds`, always the same way for the same bounds and size. Without `reset`, a small change of the view is
   * a pan by a truncated offset from the current view, so where the map ends up (to a fraction of a pixel) would
   * depend on which views it had before, e.g. whether the map got its final size before or after its data.
   * `setView` also keeps the center inside `maxBounds`.
   */
  function fitView(bounds: L.LatLngBounds) {
    _map.fitBounds(bounds, { reset: true } as L.FitBoundsOptions);
    viewChangedByUser = false;
  }

  let boundsChangedFromMap = false;
  // The user panned or zoomed the map since its bounds were last set
  let viewChangedByUser = false;
  // `invalidateSize` also ends with a "moveend" event, which isn't the user moving the map
  let isResizing = false;
  const onMapMoveEnd = () => {
    if (!isResizing) {
      viewChangedByUser = true;
    }
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

  function updateLayers(geoJson: any, data: any, options: any) {
    _map.eachLayer((layer) => _map.removeLayer(layer));
    _map.removeControl(_legend);

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'features' does not exist on type 'object... Remove this comment to see the full error message
    if (!isObject(geoJson) || !isArray(geoJson.features)) {
      _choropleth = null;
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'null' is not assignable to param... Remove this comment to see the full error message
      _map.setMaxBounds(null);
      return;
    }

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'features' does not exist on type 'object... Remove this comment to see the full error message
    const { limits, colors, legend } = createScale(geoJson.features, data, options);
    const formatValue = createNumberFormatter(options.valueFormat, options.noValuePlaceholder);

    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'object' is not assignable to par... Remove this comment to see the full error message
    _choropleth = L.geoJSON(geoJson, {
      onEachFeature(feature, layer) {
        prepareLayer({ feature, layer, data, options, limits, colors, formatValue });
      },
    }).addTo(_map);

    const mapBounds = _choropleth.getBounds();
    // Like `_map.setMaxBounds(mapBounds)`, but without moving the map: `fitView` below keeps it inside these bounds
    _map.options.maxBounds = mapBounds;
    fitView(validateBounds(options.bounds, mapBounds));

    // update legend
    if (options.legend.visible && legend.length > 0) {
      _legend.setPosition(options.legend.position.replace("-", ""));
      _map.addControl(_legend);
      _legend.renderContent(
        <Legend
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ text: any; color: any; limit: any; }[]' is... Remove this comment to see the full error message
          items={map(legend, (item) => ({ ...item, text: formatValue(item.limit) }))}
          alignText={options.legend.alignText}
        />
      );
    }
  }

  let _bounds: any = null;

  function updateBounds(bounds: any) {
    _bounds = bounds;
    if (!boundsChangedFromMap) {
      const layerBounds = _choropleth ? _choropleth.getBounds() : _map.getBounds();
      bounds = validateBounds(bounds, layerBounds);
      if (bounds) {
        fitView(bounds);
      }
    }
  }

  const unwatchResize = resizeObserver(container, () => {
    isResizing = true;
    _map.invalidateSize(false);
    isResizing = false;
    // Fit the bounds again for the new size. Keep the view if the user changed it.
    if (_choropleth && !boundsChangedFromMap && !viewChangedByUser) {
      const bounds = validateBounds(_bounds, _choropleth.getBounds());
      if (bounds) {
        fitView(bounds);
      }
    }
  });

  return {
    updateLayers,
    updateBounds,
    destroy() {
      unwatchResize();
      _map.removeControl(_legend); // _map.remove() does not cleanup controls - bug in Leaflet?
      _map.remove();
    },
  };
}
